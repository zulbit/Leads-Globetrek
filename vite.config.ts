import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'https://leads-globetrek.pages.dev',
        changeOrigin: true,
        secure: true
      }
    }
  }
});
