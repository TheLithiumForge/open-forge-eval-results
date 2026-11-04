import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 3,
  timeout: 90000,
  expect: { timeout: 5000 },
  reporter: [['list'], ['json', { outputFile: 'evidence/browser-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: { command: 'node scripts/serve-dist.ts', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
});
