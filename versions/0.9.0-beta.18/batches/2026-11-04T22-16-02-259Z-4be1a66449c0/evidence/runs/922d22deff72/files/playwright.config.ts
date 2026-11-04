import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests', use: { browserName: 'chromium' }, webServer: { command: 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false } });
