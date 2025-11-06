import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['serialport', 'node:readline', 'picocolors']
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react', 'serialport', 'picocolors'],
  },
});
