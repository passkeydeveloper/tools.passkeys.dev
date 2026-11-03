# tools.passkeys.dev API

The WebAuthn demo API behind the "Try WebAuthn" page on [tools.passkeys.dev](https://tools.passkeys.dev). It is a [Cloudflare Worker](https://developers.cloudflare.com/workers/) built with [Hono](https://hono.dev) and [@simplewebauthn/server](https://simplewebauthn.dev), using D1 for credentials and a Durable Object for single-use challenges.

## Development

Requires Node.js 24+ (a [mise](https://mise.jdx.dev) config is included).

```bash
npm install
echo "SESSION_SECRET=dev-only-secret" > .dev.vars
npx wrangler d1 migrations apply DB --local     # first run only
npm run dev                                     # http://localhost:8787
```

```bash
npm test             # Vitest, run inside the Workers runtime
npm run typecheck
```

The site is expected on `http://localhost:8080` (Eleventy's default) in development. That origin is allowed by CORS and by the WebAuthn origin check via `EXPECTED_ORIGINS` in `wrangler.jsonc`.

## Endpoints

All under `/api/v1`. Request bodies are JSON with camelCase keys.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Liveness check |
| GET | `/capabilities` | `{ algorithms }` the runtime can verify (ML-DSA isn't supported by Workers yet) |
| GET | `/session` | `{ username }` of the logged-in user, or `null` |
| POST | `/logout` | Clear the session |
| POST | `/registration/options` | Generate registration options |
| POST | `/registration/verification` | Verify a registration response and store the credential |
| POST | `/authentication/options` | Generate authentication options (omit `username` for conditional UI) |
| POST | `/authentication/verification` | Verify an authentication response and log the user in |
| GET | `/credentials` | The logged-in user's credentials, with provider name and public key details |
| DELETE | `/credentials/:id` | Delete one of the logged-in user's credentials |

## Configuration

| Name | Purpose |
| --- | --- |
| `RP_ID`, `RP_NAME` | Relying party ID and display name |
| `EXPECTED_ORIGINS` | Comma-separated origins allowed to call the API and complete ceremonies |
| `SESSION_SECRET` | Secret for signing the session cookie. Use `.dev.vars` locally and `wrangler secret put` when deployed |

The `d1_databases` entry in `wrangler.jsonc` has a placeholder `database_id`; create a database with `wrangler d1 create` before deploying. Credentials are deleted 24 hours after they were last used, by an hourly cron trigger.
