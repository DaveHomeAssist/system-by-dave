import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig({ plugins: [react()], build: { outDir: resolve(__dirname, '../../av-calculator/assets'), emptyOutDir: false, rollupOptions: { input: resolve(__dirname, 'src/main.tsx'), output: { entryFileNames: 'av-calculator.js', assetFileNames: '[name][extname]' } } } });
