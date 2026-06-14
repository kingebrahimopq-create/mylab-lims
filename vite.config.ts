import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  import path from 'path';

  export default defineConfig({
    plugins: [react()],
    resolve: { alias: { '@': path.resolve(__dirname, '.') } },
    css: { postcss: './postcss.config.js' },
    build: { target: 'es2020' },
    server: {
      port: 5173,
      host: true,
      allowedHosts: ['all'],
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  });
  