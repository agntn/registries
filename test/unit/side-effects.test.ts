import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

interface PackageManifest {
  sideEffects: string[];
}

const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf8"),
) as PackageManifest;

describe("package sideEffects", () => {
  /** obuild puts the `register()` calls in dist/_chunks, and a bundler drops that chunk unless it is listed. */
  it("should keep the adapter registration chunk when a bundler tree-shakes dist", () => {
    expect(manifest.sideEffects).toContain("./dist/_chunks/*.mjs");
  });

  it("should keep the source registration hub for tools that resolve src", () => {
    expect(manifest.sideEffects).toContain("./src/registries/index.ts");
  });
});
