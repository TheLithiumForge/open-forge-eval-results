import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: { target: 'es2022', assetsInlineLimit: 1000000 },
  test: { include: ['src/**/*.test.ts', 'src/**/*.test.tsx'] },
});
