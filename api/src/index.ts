import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Context } from 'hono';
import { ZodError, type ZodType } from 'zod';
import { getProviderName } from './aaguids';
import { supportedAlgorithms } from './algorithms';
import { ChallengeStore } from './challenge-store';
import {
  deleteCredential,
  deleteExpiredCredentials,
  getCredentialById,
  getCredentialsByUsername,
  storeCredential,
  updateSignCount,
} from './credentials';
import type { AppEnv, Env } from './env';
import { describePublicKey } from './public-key';
import {
  authenticationOptionsRequest,
  authenticationVerificationRequest,
  registrationOptionsRequest,
  registrationVerificationRequest,
} from './schemas';
import { clearSession, commitSession, sessionMiddleware } from './session';
import {
  CHALLENGE_TTL_MS,
  UnsupportedAlgorithmError,
  expectedOrigins,
  buildAuthenticationOptions,
  buildRegistrationOptions,
  verifyAuthentication,
  verifyRegistration,
  type StoredAuthenticationOptions,
  type StoredRegistrationOptions,
} from './webauthn';

export { ChallengeStore };

const CREDENTIAL_LIFETIME_MS = 24 * 60 * 60 * 1000;

const root = new Hono<AppEnv>();
const app = root.basePath('/api/v1');

// Only the origins that may run ceremonies against this RP ID can call the API cross-origin
// (e.g. the Eleventy dev server on :8080 talking to `wrangler dev` on :8787)
app.use(
  '*',
  cors({
    origin: (origin, c) => (expectedOrigins(c.env).includes(origin) ? origin : null),
    credentials: true,
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
);

app.use('*', sessionMiddleware);

root.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal server error' }, 500);
});

root.notFound((c) => c.json({ error: 'Not found' }, 404));


/** Parse and validate a JSON body, returning a 400 response on failure */
async function parseBody<T>(c: Context<AppEnv>, schema: ZodType<T>): Promise<T | Response> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch (err) {
    return c.json({ error: `Could not parse request: ${(err as Error).message}` }, 400);
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return c.json(fieldErrors(result.error), 400);
  }
  return result.data;
}

function fieldErrors(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'request';
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}

function challengeStore(c: Context<AppEnv>, key: string) {
  return c.env.CHALLENGES.getByName(key);
}

app.get('/health', (c) => c.json({ ok: true }));

app.get('/capabilities', async (c) => c.json({ algorithms: await supportedAlgorithms() }));

app.get('/session', (c) => c.json({ username: c.var.session.username ?? null }));

app.post('/logout', (c) => {
  clearSession(c);
  return c.json({ loggedOut: true });
});

app.post('/registration/options', async (c) => {
  const req = await parseBody(c, registrationOptionsRequest);
  if (req instanceof Response) return req;

  const existing = await getCredentialsByUsername(c.env.DB, req.username);

  let built;
  try {
    built = await buildRegistrationOptions(c.env, req, existing);
  } catch (err) {
    if (err instanceof UnsupportedAlgorithmError) {
      return c.json({ algorithms: [err.message] }, 400);
    }
    throw err;
  }

  await challengeStore(c, `reg:${c.var.session.sid}:${req.username}`).put(built.stored, CHALLENGE_TTL_MS);

  return c.json(built.options);
});

app.post('/registration/verification', async (c) => {
  const req = await parseBody(c, registrationVerificationRequest);
  if (req instanceof Response) return req;

  const stored = await challengeStore(c, `reg:${c.var.session.sid}:${req.username}`).take() as StoredRegistrationOptions | undefined;
  if (!stored) {
    return c.json({ error: `no options for user ${req.username}` }, 400);
  }

  try {
    const credential = await verifyRegistration(c.env, req.response as never, req.username, stored);
    await storeCredential(c.env.DB, credential);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }

  return c.json({ verified: true });
});

app.post('/authentication/options', async (c) => {
  const req = await parseBody(c, authenticationOptionsRequest);
  if (req instanceof Response) return req;

  let existing: Awaited<ReturnType<typeof getCredentialsByUsername>> = [];
  if (req.username) {
    existing = await getCredentialsByUsername(c.env.DB, req.username);
    if (existing.length === 0) {
      return c.json({ error: 'That username has no registered credentials' }, 400);
    }
  }

  const { options, stored } = await buildAuthenticationOptions(c.env, req, existing);

  await challengeStore(c, `auth:${c.var.session.sid}`).put(stored, CHALLENGE_TTL_MS);

  return c.json(options);
});

app.post('/authentication/verification', async (c) => {
  const req = await parseBody(c, authenticationVerificationRequest);
  if (req instanceof Response) return req;

  const stored = await challengeStore(c, `auth:${c.var.session.sid}`).take() as StoredAuthenticationOptions | undefined;
  if (!stored) {
    return c.json({ error: 'no options for this session' }, 400);
  }

  try {
    const credential = await getCredentialById(c.env.DB, req.response.id);
    if (!credential) {
      throw new Error('Unrecognized credential ID');
    }
    if (req.username && credential.username !== req.username) {
      throw new Error('Credential does not belong to user');
    }

    const newCounter = await verifyAuthentication(c.env, req.response as never, credential, stored);
    await updateSignCount(c.env.DB, credential.id, newCounter);

    await commitSession(c, { sid: c.var.session.sid, username: credential.username });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }

  return c.json({ verified: true });
});

app.get('/credentials', async (c) => {
  const { username } = c.var.session;
  if (!username) {
    return c.json({ error: 'Not logged in' }, 401);
  }

  const credentials = await getCredentialsByUsername(c.env.DB, username);
  return c.json({
    username,
    credentials: credentials.map(({ publicKey, ...cred }) => ({
      ...cred,
      providerName: getProviderName(cred.aaguid, cred.deviceType),
      publicKey: describePublicKey(publicKey),
    })),
  });
});

app.delete('/credentials/:id', async (c) => {
  const { username } = c.var.session;
  if (!username) {
    return c.json({ error: 'Not logged in' }, 401);
  }

  const deleted = await deleteCredential(c.env.DB, c.req.param('id'), username);
  if (!deleted) {
    return c.json({ error: 'Unrecognized credential ID' }, 404);
  }
  return c.json({ deleted: true });
});

export default {
  fetch: root.fetch,
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    await deleteExpiredCredentials(env.DB, CREDENTIAL_LIFETIME_MS);
  },
} satisfies ExportedHandler<Env>;
