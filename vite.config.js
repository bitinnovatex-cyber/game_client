import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'server_', 'SERVER_'],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://game-server-domu.onrender.com',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'https://game-server-domu.onrender.com',
        ws: true,
        changeOrigin: true,
        secure: false
      }
    }
  }
});
