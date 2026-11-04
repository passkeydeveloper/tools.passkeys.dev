# tools.passkeys.dev

Developer tools for passkeys and WebAuthn

## Development

This site is built using [Eleventy (11ty)](https://www.11ty.dev/).

### Requirements

- [Node.js 20.x+](https://nodejs.org/en/download)

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
