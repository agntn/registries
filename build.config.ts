import { readdirSync } from "node:fs";
import { defineBuildConfig } from "obuild/config";

/**
 * Every adapter file is its own bundle input, so the manifest's `import()` resolves to a stable
 * `dist/registries/<name>.mjs` that the `./registries/*` export also serves. Read from the
 * directory so a new adapter needs only its file and its manifest entry.
 */
const adapterInputs = readdirSync(new URL("./src/registries/", import.meta.url))
  .filter((file) => file.endsWith(".ts") && file !== "index.ts")
  .map((file) => `./src/registries/${file}`);

export default defineBuildConfig({
  entries: [
    {
      type: "bundle",
      input: [
        "./src/index.ts",
        "./src/ai.ts",
        "./src/registries/index.ts",
        "./src/cache/index.ts",
        "./src/cli.ts",
        "./src/mcp.ts",
        "./src/tools.ts",
        ...adapterInputs,
      ],
      /** A map to the wrong line is worse than none, and remove-comments breaks every one. */
      dts: { sourcemap: false },
    },
  ],
});
