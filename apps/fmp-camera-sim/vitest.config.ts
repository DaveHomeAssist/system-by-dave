import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import { readRelease } from "../../scripts/camera_sim_release.mjs";

export default defineConfig({
  // The same release stamp the build embeds (vite.config.ts), so tests see what the page does.
  define: { __SIM_RELEASE__: JSON.stringify(readRelease(resolve(__dirname, "../.."))) },
  test: {
    environment: "node",
    include: ["apps/fmp-camera-sim/src/**/*.test.ts"],
  },
});
