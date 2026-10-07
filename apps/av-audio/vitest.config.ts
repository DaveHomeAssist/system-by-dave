import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
export default defineConfig({ test: { include: [resolve(__dirname,"src/**/*.test.ts")] } });
