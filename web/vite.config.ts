/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Plugin frontend aliases - allows importing from @plugins/xxx
      '@plugins': path.resolve(__dirname, '../plugins'),
    },
    // Ensure node_modules resolution works for plugin imports
    preserveSymlinks: false,
    // Dedupe ensures modules are resolved from web/node_modules
    dedupe: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'lucide-react',
      'react-hot-toast',
      'recharts',
      'zustand',
      'axios',
      'date-fns',
      '@xterm/xterm',
      '@xterm/addon-fit',
      '@xterm/addon-web-links',
      '@xterm/addon-webgl',
    ],
  },
  // Optimize deps to include plugin directories
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'lucide-react',
      'react-hot-toast',
      '@xterm/xterm',
      '@xterm/addon-fit',
      '@xterm/addon-web-links',
      '@xterm/addon-webgl',
    ],
  },
  server: {
    port: 3000,
    proxy: {
      // WebSocket proxy for terminal
      '/api/terminal/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
      // WebSocket proxy for Docker container exec
      '/api/docker/containers': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
      // Regular API proxy (no WebSocket)
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
    // Allow serving files from plugins directory and web root
    fs: {
      allow: [
        path.resolve(__dirname, '.'), // web root for index.html
        path.resolve(__dirname, './src'),
        path.resolve(__dirname, '../plugins'),
        path.resolve(__dirname, './node_modules'),
      ],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          editor: ['monaco-editor'],
          xterm: ['@xterm/xterm', '@xterm/addon-fit', '@xterm/addon-web-links', '@xterm/addon-webgl'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
});
