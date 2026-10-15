import { readdirSync, readFileSync } from "node:fs";
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

/* Every TypeScript file the package ships, as paths from the repo root. */
function shippedSources(): string[] {
  return ["src", "packages"].flatMap((dir) =>
    readdirSync(new URL(`../../${dir}/`, import.meta.url), { recursive: true })
      .map(String)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => `${dir}/${file}`),
  );
}

describe("build config", () => {
  it("should keep the packages Pi supplies out of dependencies", () => {
    expect(
      Object.keys(manifest.dependencies).filter((name) => hostProvidedPackages.includes(name)),
    ).toEqual([]);
    expect(Object.keys(manifest.peerDependencies)).not.toContain("typebox");
  });

  /** OMP rewrites a bare `typebox` import to its own facade, which validates nothing. */
  it("should take every schema builder from @agntn/tools, never bare typebox", () => {
    const bare = shippedSources().filter((file) =>
      /from "typebox(?:\/[^"]*)?"/.test(
        readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"),
      ),
    );
    expect(bare).toEqual([]);
  });

  /** `declarationMap` in tsconfig turns maps on for the JS too, so only this keeps them out. */
  it("should ship no source maps", () => {
    expect(buildConfig.entries?.[0]).toMatchObject({ dts: { sourcemap: false } });
  });

  /** The extension tests read their types from dist, so a fresh clone has to build first. */
  it("should build before typechecking the tests", () => {
    const steps = manifest.scripts.typecheck.split(" && ");
    const testCheck = "tsc -p test/tsconfig.json --noEmit";

    expect(steps).toContain(testCheck);
    expect(steps.slice(0, steps.indexOf(testCheck))).toContain("pnpm build");
  });
});
