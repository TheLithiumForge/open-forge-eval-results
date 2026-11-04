import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.ts', fullyParallel: true,
  timeout: 60000, expect: { timeout: 5000 }, workers: 2,
  use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium',
    viewport: { width: 1280, height: 800 }, trace: 'retain-on-failure' },
  webServer: { command: 'node tests/serve.ts', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
});
