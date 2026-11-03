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

The "Try WebAuthn" demo on the homepage talks to a separate API project. When the site is served from `localhost` on any port other than 8787, the page calls the API at `http://localhost:8787`, so run the API locally alongside `npm run dev`. The API's own setup instructions live in its repository.

## Structure

- `src/`: Source files (Nunjucks templates, data, and tool logic).
- `src/_includes/`: Shared layouts and components.
- `src/_data/`: Global site metadata.
- `_site/`: The generated static site (output).

## Sitemaps and SEO

Sitemaps are automatically generated during the build process. SEO metadata (Open Graph, Twitter cards, etc.) is managed via the Eleventy data cascade and layouts. Overrides can be set in the Front Matter of individual pages.
