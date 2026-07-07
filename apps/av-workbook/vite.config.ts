import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(__dirname),
  base: "/av-workbook/",
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "../../av-workbook"),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: "assets/av-workbook.js",
        chunkFileNames: "assets/av-workbook-[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) return "assets/av-workbook.css";
          return "assets/[name][extname]";
        }
      }
    }
  }
});
