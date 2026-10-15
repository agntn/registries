import type { Package } from "../../src/core/types.ts";
import type { Registry } from "../../src/core/registry.ts";
import { packageInfoLines } from "../../src/commands/info.ts";

function createPackage(
  overrides: Readonly<
    Partial<
      Pick<
        Package,
        "documentation" | "homepage" | "latestVersion" | "licenses" | "name" | "repository"
      >
    >
  > = {},
): Package {
  return {
    name: "serde",
    description: "Serialization framework",
    homepage: "",
    documentation: "",
    repository: "",
    licenses: "MIT OR Apache-2.0",
    keywords: [],
    namespace: "",
    latestVersion: "1.0.220",
    metadata: {},
    ...overrides,
  };
}

function createRegistry(registryUrl: string, docsUrl: string): Registry {
  return {
    ecosystem: () => "cargo",
    fetchPackage: async () => createPackage(),
    fetchVersions: async () => [],
    fetchDependencies: async () => [],
    fetchMaintainers: async () => [],
    urls: () => ({
      registry: () => registryUrl,
      download: () => "",
      documentation: () => docsUrl,
      readme: () => "",
      purl: () => "",
    }),
  };
}

describe("packageInfoLines", () => {
  it("prints docs when documentation url adds new information", () => {
    const pkg = createPackage({
      homepage: "https://serde.rs",
      documentation: "https://docs.rs/serde",
      repository: "https://github.com/serde-rs/serde",
    });

    const lines = packageInfoLines(
      pkg,
      "serde",
      createRegistry("https://crates.io/crates/serde", "https://docs.rs/serde/1.0.220"),
    );

    expect(lines).toContain("Docs:       https://docs.rs/serde");
  });

  it("skips docs when the resolved url falls back to homepage", () => {
    const pkg = createPackage({
      name: "requests",
      homepage: "https://requests.readthedocs.io",
      latestVersion: "2.32.0",
    });

    const lines = packageInfoLines(
      pkg,
      "requests",
      createRegistry("https://pypi.org/project/requests", "https://pypi.org/project/requests"),
    );

    expect(lines.some((line) => line.includes("Docs:"))).toBe(false);
  });

  it("skips docs when the fallback matches the registry page", () => {
    const pkg = createPackage({
      name: "lodash",
      latestVersion: "4.17.21",
      licenses: "MIT",
    });

    const lines = packageInfoLines(
      pkg,
      "lodash",
      createRegistry(
        "https://www.npmjs.com/package/lodash",
        "https://www.npmjs.com/package/lodash",
      ),
    );

    expect(lines.some((line) => line.includes("Docs:"))).toBe(false);
  });

  it("skips docs when documentation matches repository", () => {
    const pkg = createPackage({
      documentation: "https://github.com/serde-rs/serde",
      repository: "https://github.com/serde-rs/serde",
    });

    const lines = packageInfoLines(
      pkg,
      "serde",
      createRegistry("https://crates.io/crates/serde", "https://docs.rs/serde/1.0.220"),
    );

    expect(lines.some((line) => line.includes("Docs:"))).toBe(false);
  });

  it("should keep whatever the registry put in a field on that field's line", () => {
    const pkg = createPackage({ licenses: "MIT" });
    pkg.description = "fine\r\nLicense:    forged\u2028\u001B[2Jtoo\u202E";

    const lines = packageInfoLines(
      pkg,
      "serde",
      createRegistry("https://crates.io/crates/serde", "https://docs.rs/serde/1.0.220"),
    );

    expect(lines[1]).toBe("fine License: forged too");
    expect(lines.filter((line) => line.startsWith("License:"))).toEqual(["License:    MIT"]);
  });
});
