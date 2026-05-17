/// <reference path="./vite-shims.d.ts" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Visual Studio typically launches the API on HTTPS in Development. Default to that.
// Override with VITE_API_PROXY_TARGET if you run the API elsewhere.
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'https://localhost:7274';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        // allow self-signed certs when proxying to https in dev
        secure: false
      }
    }
  }
});
