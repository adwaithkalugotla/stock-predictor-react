import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Anything that starts with /api -> your local backend
      '/api': {
        target: 'http://127.0.0.1:5000',  // your Flask
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // /api/analyze -> /analyze
      },
    },
  },
});
