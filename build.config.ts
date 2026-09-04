import { defineBuildConfig } from "obuild/config";
import type { BuildConfig } from "obuild";

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
      ],
      dts: true,
    },
  ],
  hooks: bundleTypeboxHook,
});
