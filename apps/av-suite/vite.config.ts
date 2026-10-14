import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(__dirname),
  base: "/av/",
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "../../av"),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: "assets/av-suite.js",
        chunkFileNames: "assets/av-suite-[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) return "assets/av-suite.css";
          return "assets/[name][extname]";
        }
      }
    }
  }
});
