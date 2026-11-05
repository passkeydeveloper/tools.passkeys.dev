export interface Session {
  sid: string;
  username?: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromBase64Url = (value: string) =>
  Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

const hmacKey = (secret: string, usages: Array<'sign' | 'verify'>) =>
  crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usages);

/** `payload.signature`, both base64url, signed with HMAC-SHA-256 */
export async function sealSession(session: Session, secret: string): Promise<string> {
  const payload = toBase64Url(encoder.encode(JSON.stringify(session)));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret, ['sign']), encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function unsealSession(value: string, secret: string): Promise<Session | undefined> {
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return undefined;

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret, ['verify']),
      fromBase64Url(signature),
      encoder.encode(payload),
    );
    if (!valid) return undefined;

    const session = JSON.parse(decoder.decode(fromBase64Url(payload)));
    return typeof session.sid === 'string' ? session : undefined;
  } catch {
    return undefined;
  }
}
