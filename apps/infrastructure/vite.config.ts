import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig({ root: resolve(__dirname), base: '/infrastructure/', plugins: [react()], build: { outDir: resolve(__dirname, '../../infrastructure'), emptyOutDir: false, rollupOptions: { output: { entryFileNames: 'assets/infrastructure.js', assetFileNames: 'assets/[name][extname]' } } } });
