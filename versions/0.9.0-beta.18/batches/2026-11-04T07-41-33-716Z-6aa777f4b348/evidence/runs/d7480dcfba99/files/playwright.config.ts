import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  workers: 3,
  timeout: 60000,
  expect: { timeout: 5000 },
  use: { baseURL: 'http://127.0.0.1:4173', headless: true, trace: 'retain-on-failure' },
  webServer: { command: 'node tests/serve.ts', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
});
