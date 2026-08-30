import oxlint from "@agntn/ox/oxlint";
import { defineConfig } from "oxlint";

export default defineConfig({
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
            name: "ExtensionAPI",
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
  ignorePatterns: ["dist"],
});
