import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // proxy any request under /analyze to your local Flask
      '/analyze': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
});
