# tools.passkeys.dev

Developer tools for passkeys and WebAuthn

## Development

This site is built using [Eleventy (11ty)](https://www.11ty.dev/).

### Requirements

- [Node.js 24.x+](https://nodejs.org/en/download) (a [mise](https://mise.jdx.dev) config pinning it is included, so `mise install` works)

### Installation

```bash
npm install
```

### Local Development

To build the site and serve it, along with the API, at `http://localhost:8080` (see [API](#api) for setup):

```bash
npm run dev
```

Because of the Worker-based architecture of the site, pages must be rebuilt any time site content is updated. Run the following command locally in a separate terminal to enable seeing updated content after saving changes in the editor:

```bash
npm run build:watch
```

### Building for Production

To generate the static site in the `public/` directory:

```bash
npm run build
```

### API

The "Try WebAuthn" demo on the homepage calls `/api/v1/*`, which is handled by a small Worker in `worker/`. It owns the session cookie and forwards each request over an RPC service binding (`WEBAUTHN`) to the `webauthnapi-passkeys-dev` Worker, which lives in its own repository. The rest of the site is served as static assets from `_site/`.

To run it locally:

1. In the API repository, run `npm run dev` (it uses port 8081, and its local dev registry connects the binding).
2. Here, create a git-ignored `.dev.vars` with `SESSION_SECRET=<anything>`, `RP_ID=localhost` and `EXPECTED_ORIGINS=http://localhost:8080`.
3. Run `npm run dev` to build the site and serve it with the API on `http://localhost:8080`. Run `npm run watch` in another terminal to rebuild when source files change.

Before deploying, set the secret with `npx wrangler secret put SESSION_SECRET`, then run `npm run deploy`.

Preview versions are served from a `*-tools-passkeys-dev.passkeydeveloper.workers.dev` hostname. For those hostnames the Worker uses the hostname as the RP ID and `https://<hostname>` as the expected origin, so ceremonies complete there, with credentials kept separate from production. Everywhere else, `RP_ID` and `EXPECTED_ORIGINS` apply. Previews should use their own `SESSION_SECRET`.

### Deployment

The site is a Cloudflare Worker serving the built `_site/` directory as static assets (see `wrangler.jsonc`). It is not a Pages project. In Cloudflare, connect the repository under Workers & Pages as a Worker (Workers Builds) with build command `npm run build`, deploy command `npx wrangler deploy`, and non-production branch deploy command `npx wrangler versions upload`.

To deploy by hand, run `npm run deploy`. `npm run preview` uploads a version without promoting it and prints its preview URL.

## Structure

- `src/`: Source files (Nunjucks templates, data, and tool logic).
- `src/_includes/`: Shared layouts and components.
- `src/_data/`: Global site metadata.
- `_site/`: The generated static site (output).

## Sitemaps and SEO

Sitemaps are automatically generated during the build process. SEO metadata (Open Graph, Twitter cards, etc.) is managed via the Eleventy data cascade and layouts. Overrides can be set in the Front Matter of individual pages.
