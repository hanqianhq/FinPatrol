import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/aliyun': {
        target: 'https://fortune.console.aliyun.com',
        changeOrigin: true,
        secure: true,
        rewrite: (proxyPath) => proxyPath.replace(/^\/api\/aliyun/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const cookie = req.headers['x-aliyun-cookie'];
            const csrfToken = req.headers['x-aliyun-csrf-token'];

            if (typeof cookie === 'string' && cookie.trim()) {
              proxyReq.setHeader('cookie', cookie);
            }
            if (typeof csrfToken === 'string' && csrfToken.trim()) {
              proxyReq.setHeader('x-csrf-token', csrfToken);
              proxyReq.setHeader('X-CSRF-TOKEN', csrfToken);
            }
            proxyReq.removeHeader('x-aliyun-cookie');
            proxyReq.removeHeader('x-aliyun-csrf-token');
          });
        },
      },
    },
  },
});
