import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
export default defineConfig({ root: resolve(__dirname), base: "/av-audio/", plugins: [react()], build: { outDir: resolve(__dirname, "../../av-audio"), emptyOutDir: true, rollupOptions: { output: { entryFileNames: "assets/av-audio.js", assetFileNames: "assets/[name][extname]" } } } });
