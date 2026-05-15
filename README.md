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
npx @11ty/eleventy --serve
```

### Building for Production

To generate the static site in the `public/` directory:

```bash
npx @11ty/eleventy
```

## Structure

- `src/`: Source files (Nunjucks templates, data, and tool logic).
- `src/_includes/`: Shared layouts and components.
- `src/_data/`: Global site metadata.
- `_site_/`: The generated static site (output).

## Sitemaps and SEO

Sitemaps are automatically generated during the build process. SEO metadata (Open Graph, Twitter cards, etc.) is managed via the Eleventy data cascade and layouts. Overrides can be set in the Front Matter of individual pages.
