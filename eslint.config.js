import { defineConfig } from "eslint/config";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";

export default defineConfig(
  {
    ignores: [
      "dist/**",
      ".astro/**",
      "node_modules/**",
      "playwright-report/**",
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // Playwright's fixture-injecting callbacks require the leading
    // parameter even when no fixtures are used, e.g.
    // `test.beforeEach(async ({}, testInfo) => ...)`. That's a framework
    // idiom, not dead code, so allow the empty object pattern there rather
    // than rewriting e2e specs (out of scope for this task) or disabling
    // the rule everywhere.
    files: ["e2e/**/*.ts"],
    rules: {
      "no-empty-pattern": ["error", { allowObjectPatternsAsParameters: true }],
    },
  },
);
