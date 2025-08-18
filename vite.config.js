// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.API_TARGET || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Your frontend calls fetch('/api/analyze') -> goes to Vercel dev on 3000
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
        // no rewrite: we want /api/analyze unchanged
      },

      // (Optional) temporary compatibility if anything still hits '/analyze'
      // '/analyze': {
      //   target: apiTarget,
      //   changeOrigin: true,
      //   rewrite: () => '/api/analyze',
      // },
    },
  },
});
