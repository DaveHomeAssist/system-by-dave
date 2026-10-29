import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig({ root: resolve(__dirname), base: '/equipment-lab/', plugins: [react()], build: { outDir: resolve(__dirname,'../../equipment-lab'), emptyOutDir: false, rollupOptions: { output: { entryFileNames: 'assets/equipment-lab.js', chunkFileNames: 'assets/equipment-lab-[name].js', assetFileNames: 'assets/[name][extname]' } } } });
