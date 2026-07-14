import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored TradingView distribution files are generated, multi-megabyte
    // bundles. Linting them can exhaust Node's heap and cannot produce
    // actionable source feedback.
    "public/charting_library/**",
    "public/datafeeds/**",
  ]),
]);

export default eslintConfig;
