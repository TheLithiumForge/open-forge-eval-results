import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', timeout: 60000, fullyParallel: true, workers: 2,
  expect: { timeout: 5000 }, reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium', screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm exec vite -- preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 20000,
  },
});
