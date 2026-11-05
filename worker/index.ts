import { sealSession, unsealSession, type Session } from './session';
import type { Env, Result, WebAuthnApi } from './env';

const COOKIE_NAME = 'session';

type Handler = (ctx: Ctx) => Promise<Response>;

interface Ctx {
  request: Request;
  env: Env;
  session: Session;
  /** Set when the response should carry a new session cookie */
  commit: (session: Session) => void;
  api: WebAuthnApi;
  rp: RelyingParty;
  params: string[];
}

interface RelyingParty {
  id: string;
  name: string;
  /** Origins WebAuthn responses may come from; also allowed to call the API cross-origin */
  origins: string[];
}

/** Turn an RPC result into the API's HTTP shape: the value, or `{ error }`/field errors with a 400 */
function respond<T>(result: Result<T>, status = 400): Response {
  if (result.ok) return Response.json(result.value);
  return Response.json(result.fieldErrors ?? { error: result.error }, { status });
}

async function readBody(request: Request): Promise<Record<string, unknown> | Response> {
  try {
    const body = await request.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>;
    return Response.json({ error: 'Request body must be an object' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: `Could not parse request: ${(err as Error).message}` }, { status: 400 });
  }
}

/**
 * Version previews are served from `<version or branch>-tools-passkeys-dev.<account>.workers.dev`.
 * Only this account can create names under its `workers.dev` subdomain, so an exact match on the
 * whole hostname is enough to trust it.
 */
const PREVIEW_HOST = /^[a-z0-9-]+-tools-passkeys-dev\.passkeydeveloper\.workers\.dev$/;

/**
 * The relying party comes from the environment, except on a preview, which can't complete
 * ceremonies for the production RP ID and so gets an RP ID and origin of its own
 */
function relyingParty(request: Request, env: Env): RelyingParty {
  const { hostname } = new URL(request.url);
  if (PREVIEW_HOST.test(hostname)) {
    return { id: hostname, name: env.RP_NAME, origins: [`https://${hostname}`] };
  }
  return {
    id: env.RP_ID,
    name: env.RP_NAME,
    origins: env.EXPECTED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  };
}

const routes: Array<[method: string, pattern: RegExp, handler: Handler]> = [
  ['GET', /^\/health$/, async () => Response.json({ ok: true })],

  ['GET', /^\/capabilities$/, async ({ api }) => Response.json(await api.getRuntimeCapabilities())],

  ['GET', /^\/session$/, async ({ session }) => Response.json({ username: session.username ?? null })],

  ['POST', /^\/logout$/, async ({ commit, session }) => {
    commit({ sid: session.sid });
    return Response.json({ loggedOut: true });
  }],

  ['POST', /^\/registration\/options$/, async ({ request, rp, session, api }) => {
    const body = await readBody(request);
    if (body instanceof Response) return body;
    return respond(
      await api.createRegistrationOptions({
        ...body,
        rpId: rp.id,
        rpName: rp.name,
        sessionId: session.sid,
      } as never),
    );
  }],

  ['POST', /^\/registration\/verification$/, async ({ request, rp, session, api }) => {
    const body = await readBody(request);
    if (body instanceof Response) return body;
    const result = await api.verifyRegistrationResponse({
      ...body,
      rpId: rp.id,
      expectedOrigins: rp.origins,
      sessionId: session.sid,
    } as never);
    return result.ok ? Response.json({ verified: true }) : respond(result);
  }],

  ['POST', /^\/authentication\/options$/, async ({ request, rp, session, api }) => {
    const body = await readBody(request);
    if (body instanceof Response) return body;
    return respond(
      await api.createAuthenticationOptions({ ...body, rpId: rp.id, sessionId: session.sid } as never),
    );
  }],

  ['POST', /^\/authentication\/verification$/, async ({ request, rp, session, api, commit }) => {
    const body = await readBody(request);
    if (body instanceof Response) return body;
    const result = await api.verifyAuthenticationResponse({
      ...body,
      rpId: rp.id,
      expectedOrigins: rp.origins,
      sessionId: session.sid,
    } as never);
    if (!result.ok) return respond(result);

    commit({ sid: session.sid, username: result.value.username });
    return Response.json({ verified: true });
  }],

  ['GET', /^\/credentials$/, async ({ rp, session, api }) => {
    if (!session.username) return Response.json({ error: 'Not logged in' }, { status: 401 });
    const result = await api.getCredentials({ rpId: rp.id, username: session.username });
    return result.ok ? Response.json({ username: session.username, credentials: result.value }) : respond(result);
  }],

  ['DELETE', /^\/credentials\/([^/]+)$/, async ({ rp, session, api, params }) => {
    if (!session.username) return Response.json({ error: 'Not logged in' }, { status: 401 });
    return respond(
      await api.deleteCredential({
        rpId: rp.id,
        username: session.username,
        id: decodeURIComponent(params[0]),
      }),
      404,
    );
  }],
];

function cookieValue(request: Request, name: string): string | undefined {
  for (const part of (request.headers.get('Cookie') ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
}

/** Only origins that may run ceremonies against this RP ID can call the API cross-origin (local dev) */
function corsHeaders(request: Request, rp: RelyingParty): Headers {
  const headers = new Headers({ Vary: 'Origin' });
  const origin = request.headers.get('Origin');
  if (origin && rp.origins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
  return headers;
}

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.slice('/api/v1'.length);
  const rp = relyingParty(request, env);
  const cors = corsHeaders(request, rp);

  if (request.method === 'OPTIONS') {
    cors.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    cors.set('Access-Control-Allow-Headers', 'Content-Type');
    return new Response(null, { status: 204, headers: cors });
  }

  // Every request has a session, so conditional UI (no username yet) still has an ID for its challenge
  const cookie = cookieValue(request, COOKIE_NAME);
  let session = (cookie && (await unsealSession(cookie, env.SESSION_SECRET))) || undefined;
  let newSession: Session | undefined = session ? undefined : { sid: crypto.randomUUID() };
  session ??= newSession!;

  let response: Response;
  const route = routes.find(([method, pattern]) => method === request.method && pattern.test(path));
  if (!route) {
    response = Response.json({ error: 'Not found' }, { status: 404 });
  } else {
    try {
      response = await route[2]({
        request,
        env,
        session,
        api: env.WEBAUTHN,
        rp,
        params: path.match(route[1])!.slice(1),
        commit: (s) => {
          newSession = s;
        },
      });
    } catch (err) {
      console.error(err);
      response = Response.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  const out = new Response(response.body, response);
  cors.forEach((value, key) => out.headers.set(key, value));
  if (newSession) {
    const secure = url.protocol === 'https:' ? '; Secure' : '';
    out.headers.append(
      'Set-Cookie',
      `${COOKIE_NAME}=${await sealSession(newSession, env.SESSION_SECRET)}; Path=/; HttpOnly; SameSite=Lax${secure}`,
    );
  }
  return out;
}

export default {
  // Only /api/* reaches the Worker (see `run_worker_first`); everything else is static assets
  fetch: handle,
} satisfies ExportedHandler<Env>;
