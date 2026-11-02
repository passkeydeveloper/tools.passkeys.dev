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

To run the development server with live reload:

```bash
npm run dev
```

### Building for Production

To generate the static site in the `public/` directory:

```bash
npm run build
```

### API

The "try out WebAuthn" API is a [Cloudflare Worker](https://developers.cloudflare.com/workers/) that also serves the built site as static assets. It uses D1 for credentials and a Durable Object for single-use challenges.

```bash
npm run build                                   # the Worker serves _site/
echo "SESSION_SECRET=dev-only-secret" > .dev.vars
npx wrangler d1 migrations apply DB --local     # first run only
npm run dev:api                                 # http://localhost:8787
```

Run the API tests and typecheck with `npm test` and `npm run typecheck`.

## Structure

- `src/`: Source files (Nunjucks templates, data, and tool logic).
- `src/_includes/`: Shared layouts and components.
- `src/_data/`: Global site metadata.
- `_site/`: The generated static site (output).
- `api/src/`: Cloudflare Worker source (Hono routes under `/api/v1`).
- `api/migrations/`: D1 schema migrations.
- `api/test/`: API tests (Vitest, run inside the Workers runtime).
- `wrangler.jsonc`: Worker, D1, and Durable Object configuration.

## Sitemaps and SEO

Sitemaps are automatically generated during the build process. SEO metadata (Open Graph, Twitter cards, etc.) is managed via the Eleventy data cascade and layouts. Overrides can be set in the Front Matter of individual pages.
