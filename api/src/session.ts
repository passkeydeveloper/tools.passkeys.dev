import type { Context, MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import type { AppEnv, Session } from './env';

const COOKIE_NAME = 'session';
const encoder = new TextEncoder();

async function hmacKey(secret: string, usages: Array<"sign" | "verify">): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usages);
}

async function seal(session: Session, secret: string): Promise<string> {
  const payload = isoBase64URL.fromUTF8String(JSON.stringify(session));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret, ['sign']), encoder.encode(payload));
  return `${payload}.${isoBase64URL.fromBuffer(new Uint8Array(signature))}`;
}

async function unseal(value: string, secret: string): Promise<Session | undefined> {
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return undefined;

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret, ['verify']),
      isoBase64URL.toBuffer(signature),
      encoder.encode(payload),
    );
    if (!valid) return undefined;

    const session = JSON.parse(isoBase64URL.toUTF8String(payload));
    return typeof session.sid === 'string' ? session : undefined;
  } catch {
    return undefined;
  }
}

export async function commitSession(c: Context<AppEnv>, session: Session): Promise<void> {
  c.set('session', session);
  setCookie(c, COOKIE_NAME, await seal(session, c.env.SESSION_SECRET), {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: new URL(c.req.url).protocol === 'https:',
  });
}

export function clearSession(c: Context<AppEnv>): void {
  deleteCookie(c, COOKIE_NAME, { path: '/' });
}

/**
 * Make sure every request has a session so authentication options (which have no username yet,
 * for conditional UI) always have a unique ID to attach their challenge to.
 */
export const sessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const cookie = getCookie(c, COOKIE_NAME);
  const existing = cookie ? await unseal(cookie, c.env.SESSION_SECRET) : undefined;

  if (existing) {
    c.set('session', existing);
  } else {
    await commitSession(c, { sid: crypto.randomUUID() });
  }

  return next();
};
