import { defineConfig, devices } from '@playwright/test';

const PORT = 8090;

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    // `localhost` is a secure context, which WebAuthn requires
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  // The virtual authenticator is driven through the Chrome DevTools Protocol
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Only the static site is served; the API is mocked per test (see tests/helpers.ts) because the
  // real one needs the webauthnapi-passkeys-dev Worker
  webServer: {
    command: `npx @11ty/eleventy --serve --quiet --port=${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
