import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig({ root: resolve(__dirname), base: '/front-office/', plugins: [react()], build: { outDir: resolve(__dirname, '../../front-office'), emptyOutDir: false, rollupOptions: { output: { entryFileNames: 'assets/front-office.js', assetFileNames: 'assets/[name][extname]' } } } });
