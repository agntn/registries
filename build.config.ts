import { readdirSync } from "node:fs";
import { defineBuildConfig } from "obuild/config";
import type { BuildConfig } from "obuild";

/**
 * Every adapter file is its own bundle input, so the manifest's `import()` resolves to a stable
 * `dist/registries/<name>.mjs` that the `./registries/*` export also serves. Read from the
 * directory so a new adapter needs only its file and its manifest entry.
 */
const adapterInputs = readdirSync(new URL("./src/registries/", import.meta.url))
  .filter((file) => file.endsWith(".ts") && file !== "index.ts")
  .map((file) => `./src/registries/${file}`);

const bundleTypeboxHook: NonNullable<BuildConfig["hooks"]> = {
  rolldownConfig(config) {
    const originalExternal = config.external;
    const isTypebox = (id: string) => /^typebox(?:\/|$)/.test(id);

    if (typeof originalExternal === "function") {
      config.external = async (id, importer, isResolved) =>
        isTypebox(id) ? false : originalExternal(id, importer, isResolved);
      return;
    }

    if (Array.isArray(originalExternal)) {
      config.external = originalExternal.filter(
        (item) => !(typeof item === "string" && isTypebox(item)),
      );
    }
  },
};

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
        "./src/tool-operations.ts",
        ...adapterInputs,
      ],
      dts: true,
    },
  ],
  hooks: bundleTypeboxHook,
});
