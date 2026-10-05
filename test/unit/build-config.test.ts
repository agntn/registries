import type { BuildConfig } from "obuild";
import manifest from "../../package.json" with { type: "json" };
import buildConfig from "../../build.config.ts";

/** Packages Pi supplies to extensions, per `HOST_PROVIDED_EXTENSION_PACKAGES` in Pi 0.99. */
const hostProvidedPackages = [
  "@earendil-works/pi-agent-core",
  "@earendil-works/pi-ai",
  "@earendil-works/pi-coding-agent",
  "@earendil-works/pi-tui",
  "@mariozechner/pi-agent-core",
  "@mariozechner/pi-ai",
  "@mariozechner/pi-coding-agent",
  "@mariozechner/pi-tui",
  "@sinclair/typebox",
  "typebox",
];

type RolldownConfigHook = NonNullable<NonNullable<BuildConfig["hooks"]>["rolldownConfig"]>;

describe("build config", () => {
  it("should keep the packages Pi supplies out of dependencies", () => {
    expect(
      Object.keys(manifest.dependencies).filter((name) => hostProvidedPackages.includes(name)),
    ).toEqual([]);
    expect(manifest.peerDependencies.typebox).toBe("*");
    expect(manifest.peerDependenciesMeta.typebox).toEqual({ optional: true });
  });

  it("should inline typebox and its subpaths into dist", async () => {
    const config: Parameters<RolldownConfigHook>[0] = {
      external: [/^#/, "node:fs", "unstorage", /^unstorage\//, "typebox", /^typebox\//],
    };

    /** SAFETY: the hook reads only the rolldown options, never the build context. */
    await buildConfig.hooks?.rolldownConfig?.(config, {} as Parameters<RolldownConfigHook>[1]);

    expect(config.external).toEqual([/^#/, "node:fs", "unstorage", /^unstorage\//]);
  });
});
