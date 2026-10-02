import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(__dirname),
  base: "/av-video/",
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "../../av-video"),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: "assets/av-video.js",
        chunkFileNames: "assets/av-video-[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) return "assets/av-video.css";
          return "assets/[name][extname]";
        }
      }
    }
  }
});
