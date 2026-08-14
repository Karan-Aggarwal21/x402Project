import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Import boundaries from Docs/REPO_STRUCTURE.md section 4.
 * These four rules are what keep the four divisions from coupling to each other.
 * A violation fails the build, so it never has to be caught in code review.
 */
const boundaries = [
  {
    // The policy engine must stay pure so determinism (NFR-2) is testable without a database.
    files: ["src/core/policy/engine.ts", "src/core/policy/rules.ts", "src/core/risk/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/core/db*", "postgres", "drizzle-orm"],
          message: "Policy engine must stay pure. Do the I/O in src/core/policy/context.ts.",
        }],
      }],
    },
  },
  {
    // If the x402 SDK surface differs from the docs, exactly one file changes.
    // The throwaway seller is exempt: sellers use @x402/next, which the buyer-side adapter does not wrap.
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: ["src/payments/x402/**", "src/payments/scripts/poc-seller.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@x402/*"],
          message: "Only src/payments/x402/adapter.ts may import the x402 SDK.",
        }],
      }],
    },
  },
  {
    // Server code in the browser bundle leaks secrets. No exceptions.
    files: ["src/dashboard/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/core/*", "@/payments/*", "@/demo/*"],
          message: "Dashboard talks to the server over HTTP only. Use src/dashboard/api-client.",
        }],
      }],
    },
  },
  {
    // Every routing file is a re-export. A long file here means logic escaped its division.
    files: ["app/**/route.ts", "app/**/page.tsx", "app/**/layout.tsx"],
    ignores: ["app/layout.tsx"],
    rules: {
      "max-lines": ["error", { max: 12, skipBlankLines: false, skipComments: false }],
    },
  },
  {
    // Payments consumes the decision, never the rules that produced it.
    files: ["src/payments/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/core/policy/*", "@/core/risk/*", "@/core/db/*"],
          message: "Import the public API from @/core instead of reaching into core internals.",
        }],
      }],
    },
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...boundaries,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
