import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Desktop Tauri build — points to the web app source
// The desktop app reuses apps/web's source with a Tauri-specific entry point

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],

  // Root is the web app source
  root: path.resolve(__dirname, '../web'),

  // Output to desktop dist for Tauri to pick up
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../web/src'),
    },
  },

  // Required for Tauri dev: prevent Vite from obscuring Rust errors
  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // Tauri re-builds trigger hot reload
      ignored: ['**/src-tauri/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  envPrefix: ['VITE_', 'TAURI_ENV_*'],

  define: {
    // Inject desktop mode flag for the web app to detect
    __TAURI_DESKTOP__: JSON.stringify(true),
  },
});
