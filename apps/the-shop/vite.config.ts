import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig({ root: resolve(__dirname), base: '/the-shop/', plugins: [react()], build: { outDir: resolve(__dirname, 'dist'), emptyOutDir: false, rollupOptions: { output: { entryFileNames: 'assets/the-shop.js', assetFileNames: 'assets/[name][extname]' } } } });
