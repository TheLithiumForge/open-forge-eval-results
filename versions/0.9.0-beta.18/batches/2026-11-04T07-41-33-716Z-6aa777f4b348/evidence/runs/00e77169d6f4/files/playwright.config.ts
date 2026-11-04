import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', fullyParallel: true, workers: 2,
  use: { baseURL: 'http://127.0.0.1:4173', headless: true },
  webServer: { command: 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort', port: 4173, reuseExistingServer: false },
  reporter: [['list'], ['html', { open: 'never' }]],
});
