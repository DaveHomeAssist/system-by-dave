import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(__dirname), base: "/show-ops/", plugins: [react()],
  build: {
    // The existing pure domain model and compatibility probes remain source here.
    outDir: resolve(__dirname, "../../show-ops"), emptyOutDir: false,
    rollupOptions: { output: { entryFileNames: "assets/show-ops.js", assetFileNames: "assets/[name][extname]" } },
  },
});
