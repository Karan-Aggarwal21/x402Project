// Mirrors the path aliases in tsconfig.json so tests import the same way source does.
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const src = (segment: string) => fileURLToPath(new URL(`./src/${segment}`, import.meta.url));

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts", "tests/**/*.test.ts"] },
  resolve: {
    alias: {
      "@/shared": src("shared"),
      "@/payments": src("payments"),
      "@/core": src("core"),
      "@/dashboard": src("dashboard"),
      "@/demo": src("demo"),
    },
  },
});
