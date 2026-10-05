import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

/** The root options for every file, `docs/` included: its own tsconfig extends `.nuxt/`, which CI never generates. */
const tsconfigRaw = readFileSync(new URL("tsconfig.json", import.meta.url), "utf8");

export default defineConfig({
  test: {
    globals: true,
    reporters: "dot",
    projects: [
      {
        esbuild: { tsconfigRaw },
        test: { name: "unit", include: ["test/unit/**/*.test.ts"], globals: true },
      },
      { test: { name: "e2e", include: ["test/e2e/**/*.test.ts"], globals: true } },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/types.ts", "src/**/*.test.ts"],
    },
  },
});
