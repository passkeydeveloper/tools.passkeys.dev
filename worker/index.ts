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
  params: string[];
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

function expectedOrigins(env: Env): string[] {
  return env.EXPECTED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
}

const routes: Array<[method: string, pattern: RegExp, handler: Handler]> = [
  ['GET', /^\/health$/, async () => Response.json({ ok: true })],

  ['GET', /^\/capabilities$/, async ({ api }) => Response.json(await api.getRuntimeCapabilities())],

  ['GET', /^\/session$/, async ({ session }) => Response.json({ username: session.username ?? null })],

  ['POST', /^\/logout$/, async ({ commit, session }) => {
    commit({ sid: session.sid });
    return Response.json({ loggedOut: true });
  }],

  ['POST', /^\/registration\/options$/, async ({ request, env, session, api }) => {
    const body = await readBody(request);
    if (body instanceof Response) return body;
    return respond(
      await api.createRegistrationOptions({
        ...body,
        rpId: env.RP_ID,
        rpName: env.RP_NAME,
        sessionId: session.sid,
      } as never),
    );
  }],

  ['POST', /^\/registration\/verification$/, async ({ request, env, session, api }) => {
    const body = await readBody(request);
    if (body instanceof Response) return body;
    const result = await api.verifyRegistrationResponse({
      ...body,
      rpId: env.RP_ID,
      expectedOrigins: expectedOrigins(env),
      sessionId: session.sid,
    } as never);
    return result.ok ? Response.json({ verified: true }) : respond(result);
  }],

  ['POST', /^\/authentication\/options$/, async ({ request, env, session, api }) => {
    const body = await readBody(request);
    if (body instanceof Response) return body;
    return respond(
      await api.createAuthenticationOptions({ ...body, rpId: env.RP_ID, sessionId: session.sid } as never),
    );
  }],

  ['POST', /^\/authentication\/verification$/, async ({ request, env, session, api, commit }) => {
    const body = await readBody(request);
    if (body instanceof Response) return body;
    const result = await api.verifyAuthenticationResponse({
      ...body,
      rpId: env.RP_ID,
      expectedOrigins: expectedOrigins(env),
      sessionId: session.sid,
    } as never);
    if (!result.ok) return respond(result);

    commit({ sid: session.sid, username: result.value.username });
    return Response.json({ verified: true });
  }],

  ['GET', /^\/credentials$/, async ({ env, session, api }) => {
    if (!session.username) return Response.json({ error: 'Not logged in' }, { status: 401 });
    const result = await api.getCredentials({ rpId: env.RP_ID, username: session.username });
    return result.ok ? Response.json({ username: session.username, credentials: result.value }) : respond(result);
  }],

  ['DELETE', /^\/credentials\/([^/]+)$/, async ({ env, session, api, params }) => {
    if (!session.username) return Response.json({ error: 'Not logged in' }, { status: 401 });
    return respond(
      await api.deleteCredential({
        rpId: env.RP_ID,
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
function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers({ Vary: 'Origin' });
  const origin = request.headers.get('Origin');
  if (origin && expectedOrigins(env).includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
  return headers;
}

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.slice('/api/v1'.length);
  const cors = corsHeaders(request, env);

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
