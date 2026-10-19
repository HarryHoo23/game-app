import { defineConfig } from "vitest/config";

// Keep the original app's tests independent from the separately installed prototype.
export default defineConfig({ test: { include: ["src/tests/**/*.test.ts"] } });
