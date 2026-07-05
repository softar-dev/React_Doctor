import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  base: '/',
  build: {
    outDir: '../backend/public',   // Express serves this as static
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      // Forward /api/* and /screenshots/* to the backend during dev
      '/api':         'http://localhost:3000',
      '/screenshots': 'http://localhost:3000',
    },
  },
});