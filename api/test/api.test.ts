import { SELF, env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { VirtualAuthenticator } from './virtual-authenticator';

const registrationRequest = {
  username: 'alice',
  userVerification: 'preferred',
  attestation: 'none',
  attachment: 'all',
  algorithms: ['es256'],
  discoverableCredential: 'preferred',
  hints: [],
};

const authenticationRequest = { userVerification: 'preferred', hints: [] };

/** A fetch wrapper that keeps the session cookie like a browser would */
function client() {
  let cookie = '';
  return async (path: string, init: { method?: string; body?: unknown } = {}) => {
    const res = await SELF.fetch(`https://example.com/api/v1${path}`, {
      method: init.method ?? (init.body ? 'POST' : 'GET'),
      headers: { 'content-type': 'application/json', ...(cookie && { cookie }) },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return { status: res.status, json: (await res.json()) as any };
  };
}

async function register(api: ReturnType<typeof client>, authenticator: VirtualAuthenticator, overrides = {}) {
  const { json: options } = await api('/registration/options', {
    body: { ...registrationRequest, ...overrides },
  });
  const response = await authenticator.register(options);
  return api('/registration/verification', { body: { username: 'alice', response } });
}

beforeEach(async () => {
  await env.DB.exec('DELETE FROM credentials');
});

describe('registration', () => {
  it('generates options honoring the request', async () => {
    const api = client();
    const { status, json } = await api('/registration/options', {
      body: {
        ...registrationRequest,
        algorithms: ['rs256', 'es256'],
        attachment: 'platform',
        hints: ['hybrid'],
        discoverableCredential: 'required',
      },
    });

    expect(status).toBe(200);
    expect(json.pubKeyCredParams.map((p: any) => p.alg)).toEqual([-257, -7]);
    expect(json.authenticatorSelection).toMatchObject({
      authenticatorAttachment: 'platform',
      residentKey: 'required',
    });
    expect(json.hints).toEqual(['hybrid']);
    expect(json.extensions).toEqual({ credProps: true });
  });

  it('sends an empty pubKeyCredParams when no algorithms are selected', async () => {
    const { json } = await client()('/registration/options', {
      body: { ...registrationRequest, algorithms: [] },
    });
    expect(json.pubKeyCredParams).toEqual([]);
  });

  it('rejects invalid requests and algorithms the runtime cannot verify', async () => {
    const api = client();
    const invalid = await api('/registration/options', { body: { ...registrationRequest, username: '' } });
    expect(invalid.status).toBe(400);
    expect(invalid.json.username).toBeDefined();

    const pqc = await api('/registration/options', { body: { ...registrationRequest, algorithms: ['mldsa44'] } });
    expect(pqc.status).toBe(400);
  });

  it('registers a credential and excludes it from later registrations', async () => {
    const api = client();
    const authenticator = new VirtualAuthenticator();
    const result = await register(api, authenticator);
    expect(result).toMatchObject({ status: 200, json: { verified: true } });

    const { json } = await api('/registration/options', { body: registrationRequest });
    expect(json.excludeCredentials).toHaveLength(1);
  });

  it('only accepts a challenge once', async () => {
    const api = client();
    const authenticator = new VirtualAuthenticator();
    const { json: options } = await api('/registration/options', { body: registrationRequest });
    const response = await authenticator.register(options);

    const first = await api('/registration/verification', { body: { username: 'alice', response } });
    const replay = await api('/registration/verification', { body: { username: 'alice', response } });
    expect(first.status).toBe(200);
    expect(replay.status).toBe(400);
  });

  it('rejects a wrong origin', async () => {
    const api = client();
    const { json: options } = await api('/registration/options', { body: registrationRequest });
    const response = await new VirtualAuthenticator('example.com', 'https://evil.example').register(options);
    const result = await api('/registration/verification', { body: { username: 'alice', response } });
    expect(result.status).toBe(400);
  });
});

describe('authentication', () => {
  it('logs in with a registered credential and updates the sign count', async () => {
    const api = client();
    const authenticator = new VirtualAuthenticator();
    await register(api, authenticator);

    const { json: options } = await api('/authentication/options', {
      body: { ...authenticationRequest, username: 'alice' },
    });
    expect(options.allowCredentials).toHaveLength(1);

    const response = await authenticator.authenticate(options);
    const result = await api('/authentication/verification', { body: { username: 'alice', response } });
    expect(result).toMatchObject({ status: 200, json: { verified: true } });

    expect((await api('/session')).json.username).toBe('alice');
    const { json } = await api('/credentials');
    expect(json.credentials[0]).toMatchObject({ signCount: 1, isDiscoverable: true });
  });

  it('supports username-less (conditional UI) authentication', async () => {
    const api = client();
    const authenticator = new VirtualAuthenticator();
    await register(api, authenticator);

    const { json: options } = await api('/authentication/options', { body: authenticationRequest });
    expect(options.allowCredentials).toEqual([]);

    const response = await authenticator.authenticate(options);
    const result = await api('/authentication/verification', { body: { response } });
    expect(result.status).toBe(200);
  });

  it('rejects unknown usernames and mismatched users', async () => {
    const api = client();
    const unknown = await api('/authentication/options', { body: { ...authenticationRequest, username: 'nobody' } });
    expect(unknown.status).toBe(400);

    const authenticator = new VirtualAuthenticator();
    await register(api, authenticator);
    const { json: options } = await api('/authentication/options', { body: authenticationRequest });
    const response = await authenticator.authenticate(options);
    const mismatch = await api('/authentication/verification', { body: { username: 'bob', response } });
    expect(mismatch.status).toBe(400);
  });

  it('does not let a different session consume the challenge', async () => {
    const api = client();
    const authenticator = new VirtualAuthenticator();
    await register(api, authenticator);

    const { json: options } = await api('/authentication/options', { body: authenticationRequest });
    const response = await authenticator.authenticate(options);
    const result = await client()('/authentication/verification', { body: { response } });
    expect(result.status).toBe(400);
  });
});

describe('credentials', () => {
  it('requires login, and only lets the owner delete', async () => {
    const owner = client();
    const authenticator = new VirtualAuthenticator();
    await register(owner, authenticator);
    const { json: options } = await owner('/authentication/options', { body: authenticationRequest });
    await owner('/authentication/verification', { body: { response: await authenticator.authenticate(options) } });

    const id = (await owner('/credentials')).json.credentials[0].id;

    expect((await client()('/credentials')).status).toBe(401);
    expect((await client()(`/credentials/${id}`, { method: 'DELETE' })).status).toBe(401);

    expect((await owner(`/credentials/${id}`, { method: 'DELETE' })).status).toBe(200);
    expect((await owner('/credentials')).json.credentials).toEqual([]);
  });

  it('forgets the user on logout', async () => {
    const api = client();
    const authenticator = new VirtualAuthenticator();
    await register(api, authenticator);
    const { json: options } = await api('/authentication/options', { body: authenticationRequest });
    await api('/authentication/verification', { body: { response: await authenticator.authenticate(options) } });
    expect((await api('/session')).json.username).toBe('alice');

    await api('/logout', { method: 'POST' });
    expect((await client()('/session')).json.username).toBeNull();
  });
});

describe('credential details', () => {
  async function loginWith(authenticator: VirtualAuthenticator, registrationOptions = {}) {
    const api = client();
    const { json: options } = await api('/registration/options', { body: registrationRequest });
    const response = await authenticator.register(options, registrationOptions);
    await api('/registration/verification', { body: { username: 'alice', response } });

    const { json: authOptions } = await api('/authentication/options', { body: authenticationRequest });
    await api('/authentication/verification', { body: { response: await authenticator.authenticate(authOptions) } });
    return api;
  }

  it('describes the public key', async () => {
    const api = await loginWith(new VirtualAuthenticator());
    const { json } = await api('/credentials');
    expect(json.credentials[0].publicKey).toEqual({
      kty: { id: 2, name: 'EC2' },
      alg: { id: -7, name: 'ES256' },
    });
  });

  it('names synced credentials with an all-zero AAGUID as iCloud Keychain', async () => {
    const api = await loginWith(new VirtualAuthenticator(), { synced: true });
    const { json } = await api('/credentials');
    expect(json.credentials[0]).toMatchObject({ deviceType: 'multiDevice', backedUp: true, providerName: 'iCloud Keychain' });
  });

  it('has no provider name for unrecognized device-bound credentials', async () => {
    const api = await loginWith(new VirtualAuthenticator());
    const { json } = await api('/credentials');
    expect(json.credentials[0]).toMatchObject({ deviceType: 'singleDevice', providerName: null });
  });
});

describe('origins', () => {
  it('accepts ceremonies from any expected origin', async () => {
    const api = client();
    const { json: options } = await api('/registration/options', { body: registrationRequest });
    const response = await new VirtualAuthenticator('example.com', 'https://other.example').register(options);
    const result = await api('/registration/verification', { body: { username: 'alice', response } });
    expect(result.status).toBe(200);
  });
});

describe('unknown routes', () => {
  it('returns a JSON 404', async () => {
    const res = await SELF.fetch('https://example.com/does-not-exist');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });
});

describe('CORS', () => {
  const url = 'https://example.com/api/v1/registration/options';

  it('answers preflights from allowed origins with credentials', async () => {
    const res = await SELF.fetch(url, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://other.example',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://other.example');
    expect(res.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('does not grant access to other origins', async () => {
    const res = await SELF.fetch('https://example.com/api/v1/capabilities', {
      headers: { origin: 'https://evil.example' },
    });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});
