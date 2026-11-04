import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { target: 'es2022', assetsInlineLimit: 10_000_000 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
