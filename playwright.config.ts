import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1,
  timeout: 30_000, expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'here-ui', testDir: './tests/e2e-here', use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:3101' } },
  ],
  // Never reuse a user's live server or inherit a real provider credential.
  webServer: process.env.PRICE_PUMP_EXTERNAL_DEMO_SERVER === '1' ? undefined : [
    { command: 'node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100', url: 'http://127.0.0.1:3100', reuseExistingServer: false, env: { DATA_PROVIDER: 'demo', HERE_API_KEY: '' }, timeout: 120_000 },
    { command: 'node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3101', url: 'http://127.0.0.1:3101', reuseExistingServer: false, env: { DATA_PROVIDER: 'here', HERE_API_KEY: '' }, timeout: 120_000 },
  ],
});
