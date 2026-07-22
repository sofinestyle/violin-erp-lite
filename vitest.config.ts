import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./apps/admin", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.{test,spec}.{ts,tsx}", "apps/*/tests/**/*.{test,spec}.{ts,tsx}"],
  },
});
