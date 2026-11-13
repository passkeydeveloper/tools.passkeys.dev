import type { Page } from '@playwright/test';

export interface MockApi {
  /** JSON bodies POSTed to each endpoint, keyed by path (e.g. `/registration/options`) */
  requests: Record<string, any[]>;
}

const toBase64URL = (text: string) => Buffer.from(text).toString('base64url');

/**
 * Attach a software authenticator that approves every ceremony, so the browser's real WebAuthn
 * API can be exercised without any user interaction
 */
export async function addVirtualAuthenticator(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

/**
 * Stand in for the `/api/v1` Worker. Options are shaped like the real ones so the browser accepts
 * them, and verification always succeeds. Requests are recorded for assertions.
 */
export async function mockApi(page: Page): Promise<MockApi> {
  const api: MockApi = { requests: {} };

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.slice('/api/v1'.length);
    const body = request.postDataJSON() ?? undefined;
    if (request.method() === 'POST') {
      (api.requests[path] ??= []).push(body);
    }

    switch (`${request.method()} ${path}`) {
      case 'GET /capabilities':
        return route.fulfill({ json: { algorithms: ['ed25519', 'es256', 'rs256'] } });
      case 'POST /registration/options':
        return route.fulfill({
          json: {
            rp: { id: 'localhost', name: 'localhost' },
            user: {
              id: toBase64URL(body.username),
              name: body.username,
              displayName: body.username,
            },
            challenge: toBase64URL('registration-challenge'),
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
            authenticatorSelection: {
              residentKey: 'required',
              requireResidentKey: true,
              userVerification: body.userVerification,
            },
            attestation: 'none',
          },
        });
      case 'POST /registration/verification':
        return route.fulfill({ json: { credentialId: body.response.id } });
      case 'POST /authentication/options':
        return route.fulfill({
          json: {
            rpId: 'localhost',
            challenge: toBase64URL('authentication-challenge'),
            allowCredentials: [],
            userVerification: body.userVerification,
          },
        });
      case 'POST /authentication/verification':
        return route.fulfill({
          json: { username: body.username ?? 'discovered', credentialId: body.response.id },
        });
      // Used by the profile page the demo redirects to after signing in
      case 'GET /session':
        return route.fulfill({ json: { username: 'someone' } });
      case 'GET /credentials':
        return route.fulfill({ json: { credentials: [] } });
      default:
        return route.fulfill({ status: 404, json: { error: 'Not found' } });
    }
  });

  return api;
}
