import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', fullyParallel: true, workers: 4, timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/serve.mjs', url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});
