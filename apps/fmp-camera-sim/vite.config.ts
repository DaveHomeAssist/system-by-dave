import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// The dev server injects inline scripts for React refresh, which the production CSP forbids.
// Drop the CSP meta only while serving; the built page keeps it.
function devWithoutCsp(): Plugin {
  return {
    name: "fmp-camera-sim:dev-without-csp",
    apply: "serve",
    transformIndexHtml(html) {
      return html.replace(/\s*<meta http-equiv="Content-Security-Policy"[^>]*>/, "");
    },
  };
}

export default defineConfig({
  root: resolve(__dirname),
  // Relative so the same files work at housevideo.app/camera-sim/ and on disk.
  base: "./",
  plugins: [react(), devWithoutCsp()],
  build: {
    outDir: resolve(__dirname, "../../camera-sim"),
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        entryFileNames: "assets/camera-sim-[hash].js",
        chunkFileNames: "assets/camera-sim-[name]-[hash].js",
        assetFileNames: "assets/camera-sim-[hash][extname]",
      },
    },
  },
});
