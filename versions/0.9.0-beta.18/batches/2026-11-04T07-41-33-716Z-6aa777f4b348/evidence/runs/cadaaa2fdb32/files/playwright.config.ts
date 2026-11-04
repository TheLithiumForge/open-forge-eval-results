import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  tsconfig: './tsconfig.app.json',
  fullyParallel: true,
  workers: 2,
  timeout: 45000,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/serve.ts',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});
