import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["apps/fmp-camera-sim/src/**/*.test.ts"],
  },
});
