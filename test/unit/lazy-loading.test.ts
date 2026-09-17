import manifest from "../../package.json" with { type: "json" };
import { Client } from "../../src/core/client.ts";
import { UnknownEcosystemError } from "../../src/core/errors.ts";
import { create, ecosystems, has } from "../../src/core/registry.ts";

/**
 * Each adapter module records its own evaluation. vitest runs a mock factory the first time the
 * module is imported, so the list is the import order the registry under test actually caused.
 */
const loaded = vi.hoisted(() => {
  const modules: string[] = [];

  function stubAdapter(ecosystem: string) {
    return class {
      readonly baseURL: string;
      readonly client: unknown;

      constructor(baseURL: string, client: unknown) {
        this.baseURL = baseURL;
        this.client = client;
      }

      ecosystem() {
        return ecosystem;
      }
    };
  }

  return {
    modules,
    adapter: (ecosystem: string, exportName: string) => () => {
      modules.push(ecosystem);
      return { [exportName]: stubAdapter(ecosystem) };
    },
  };
});

vi.mock("../../src/registries/npm.ts", loaded.adapter("npm", "NpmRegistry"));
vi.mock("../../src/registries/cargo.ts", loaded.adapter("cargo", "CargoRegistry"));
vi.mock("../../src/registries/pypi.ts", loaded.adapter("pypi", "PyPIRegistry"));
vi.mock("../../src/registries/rubygems.ts", loaded.adapter("gem", "RubyGemsRegistry"));
vi.mock("../../src/registries/packagist.ts", loaded.adapter("composer", "PackagistRegistry"));
vi.mock("../../src/registries/alpm.ts", loaded.adapter("alpm", "AlpmRegistry"));

describe("lazy adapters", () => {
  it("should know every built-in ecosystem without loading an adapter", () => {
    expect(ecosystems()).toEqual(["npm", "cargo", "pypi", "gem", "composer", "alpm"]);
    expect(has("npm")).toBe(true);
    expect(has("hex")).toBe(false);
    expect(loaded.modules).toEqual([]);
  });

  it("should import only the adapter a create asks for", async () => {
    const client = new Client();
    const registry = await create("npm", undefined, client);

    expect(loaded.modules).toEqual(["npm"]);
    expect(registry.ecosystem()).toBe("npm");
    expect(registry).toMatchObject({ baseURL: "https://registry.npmjs.org", client });
  });

  it("should reuse the loaded module for the next instance", async () => {
    const first = await create("npm");
    const second = await create("npm", "https://npm.example.com");

    expect(loaded.modules).toEqual(["npm"]);
    expect(second).not.toBe(first);
    expect(second).toMatchObject({ baseURL: "https://npm.example.com" });
  });

  it("should reject an unknown ecosystem without loading anything", async () => {
    await expect(create("hex")).rejects.toBeInstanceOf(UnknownEcosystemError);
    expect(loaded.modules).toEqual(["npm"]);
  });

  it("should share one import between parallel cold creates", async () => {
    const registries = await Promise.all([create("cargo"), create("cargo"), create("cargo")]);

    expect(loaded.modules).toEqual(["npm", "cargo"]);
    expect(new Set(registries).size).toBe(3);
  });
});

describe("package sideEffects", () => {
  /** Nothing registers at import anymore, so a bundler may drop every unused module of dist. */
  it("should declare the package free of import side effects", () => {
    expect(manifest.sideEffects).toBe(false);
  });
});
