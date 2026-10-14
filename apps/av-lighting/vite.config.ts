import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig({ root: resolve(__dirname), base: '/av-lighting/', plugins: [react()], build: { outDir: resolve(__dirname, '../../av-lighting'), emptyOutDir: false, rollupOptions: { output: { entryFileNames: 'assets/av-lighting.js', assetFileNames: 'assets/[name][extname]' } } } });
