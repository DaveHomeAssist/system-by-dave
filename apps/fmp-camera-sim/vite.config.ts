import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { readRelease, releaseStamp, VERSION_META } from "../../scripts/camera_sim_release.mjs";

// The running release: the newest entry in CHANGELOG.md plus a fingerprint of the shipped source.
// Deterministic, so a rebuild of unchanged source still matches the committed camera-sim/.
const release = readRelease(resolve(__dirname, "../.."));

// Fills the version meta tag in index.html, which the offline build carries over.
function releaseStampMeta(): Plugin {
  return {
    name: "fmp-camera-sim:release-stamp",
    transformIndexHtml(html) {
      if (!html.includes("__SIM_RELEASE_STAMP__")) throw new Error(`index.html is missing its ${VERSION_META} placeholder.`);
      return html.replace("__SIM_RELEASE_STAMP__", releaseStamp(release));
    },
  };
}

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
  plugins: [react(), devWithoutCsp(), releaseStampMeta()],
  define: { __SIM_RELEASE__: JSON.stringify(release) },
  build: {
    outDir: resolve(__dirname, "../../camera-sim"),
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
    // Multi-chunk output is intentionally off: scripts/build_camera_sim_offline.mjs inlines the
    // single entry module into a hash-pinned offline HTML. Dynamic import() chunks would be
    // unreachable under connect-src 'none' / file:// until that inliner learns multi-chunk pins.
      output: {
        entryFileNames: "assets/camera-sim-[hash].js",
        chunkFileNames: "assets/camera-sim-[name]-[hash].js",
        assetFileNames: "assets/camera-sim-[hash][extname]",
      },
    },
  },
});
