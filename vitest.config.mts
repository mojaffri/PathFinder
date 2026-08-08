import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "."),
      "server-only": path.resolve(dirname, "./tests/support/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
