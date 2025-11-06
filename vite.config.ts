import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['serialport', 'node:readline', 'picocolors', 'electron']
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react', 'serialport', 'picocolors'],
  },
  resolve: {
    alias: {
      'serialport': '/src/lib/empty-module.js',
      'picocolors': '/src/lib/empty-module.js',
      'node:readline': '/src/lib/empty-module.js'
    }
  }
}));
