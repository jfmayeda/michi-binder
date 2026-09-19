import { defineConfig, devices } from '@playwright/test';

/**
 * PLAYWRIGHT_CHROMIUM_PATH lets a machine that already has a Chromium build
 * point at it instead of downloading a second one. Unset, behaviour is the
 * Playwright default.
 */
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
  },
  webServer: {
    command: 'npm run dev -- --port 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
