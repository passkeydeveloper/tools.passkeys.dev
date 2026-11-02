import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, 'api/migrations'));

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          // The pool bundles a workerd that can lag behind wrangler's compatibility date
          compatibilityDate: '2026-08-01',
          bindings: {
            TEST_MIGRATIONS: migrations,
            SESSION_SECRET: 'test-secret',
            RP_ID: 'example.com',
            EXPECTED_ORIGINS: 'https://example.com',
            RELATED_ORIGINS: 'https://related.example',
            AASA_APP_ID_PREFIX: 'TEAMID1234',
            AASA_BUNDLE_ID: 'com.example.app',
          },
        },
      }),
    ],
    test: {
      include: ['api/test/**/*.test.ts'],
      setupFiles: ['./api/test/setup.ts'],
    },
  };
});
