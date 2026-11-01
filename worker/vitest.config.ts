import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      // The pool bundles a workerd that can lag behind wrangler's compatibility date
      miniflare: { compatibilityDate: '2026-08-01' },
    }),
  ],
});
