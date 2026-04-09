/// <reference path="./vite-shims.d.ts" />
import path from 'path';
var _a;
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Visual Studio typically launches the API on HTTPS in Development. Default to that.
// Override with VITE_API_PROXY_TARGET if you run the API elsewhere.
var apiTarget = (_a = process.env.VITE_API_PROXY_TARGET) !== null && _a !== void 0 ? _a : 'http://localhost:5123';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
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
