import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  timeout: 60_000,
  expect: { timeout: 5_000 },
  reporter: [['list'], ['json', { outputFile: 'evidence/browser-results.json' }]],
  use: { browserName: 'chromium', baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1280, height: 800 }, trace: 'retain-on-failure' },
  webServer: { command: 'npm exec vite preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173', reuseExistingServer: false },
});
