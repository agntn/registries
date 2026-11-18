import oxfmt from "@agntn/ox/oxfmt";
import oxlint from "@agntn/ox/oxlint";
import { defineConfig } from "vite-plus";

/** Lint, format and test run on Vite+. The build stays on obuild (`build.config.ts`). */
export default defineConfig({
  /** `docs/tsconfig.json` points at `.nuxt/`, which CI never generates. */
  tsconfig: "tsconfig.json",
  fmt: { ...oxfmt, ignorePatterns: ["dist", "docs"] },
  lint: {
    ...oxlint,
    rules: {
      ...oxlint.rules,
      "typescript/prefer-readonly-parameter-types": [
        "error",
        {
          allow: [
            { from: "file", name: "ToolResult" },
            {
              from: "package",
              name: ["ExtensionAPI", "ToolDefinition"],
              package: "@earendil-works/pi-coding-agent",
            },
            {
              from: "package",
              name: ["ExtensionAPI", "ToolDefinition"],
              package: "@oh-my-pi/pi-coding-agent",
            },
            { from: "lib", name: ["AbortSignal", "ErrorOptions"] },
            { from: "file", name: "Client", path: "./src/core/client.ts" },
            {
              from: "file",
              name: [
                "ClientOptions",
                "CreateCachedOptions",
                "Dependency",
                "Lockfile",
                "LockfileEntry",
                "Maintainer",
                "Package",
                "ParsedPURL",
                "RateLimiter",
                "Registry",
                "URLBuilder",
                "Version",
              ],
            },
            { from: "package", name: "Storage", package: "unstorage" },
          ],
          ignoreInferredTypes: true,
        },
      ],
    },
    ignorePatterns: ["dist", "docs"],
  },
  test: {
    globals: true,
    reporters: "dot",
    projects: [
      { test: { name: "unit", include: ["test/unit/**/*.test.ts"] } },
      { test: { name: "e2e", include: ["test/e2e/**/*.test.ts"] } },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/types.ts", "src/**/*.test.ts"],
    },
  },
});
