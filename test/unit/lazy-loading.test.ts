import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "../../src/core/client.ts";
import { UnknownEcosystemError } from "../../src/core/errors.ts";
import { create, ecosystems, has } from "../../src/core/registry.ts";

/**
 * Each adapter module records its own evaluation. vitest runs a mock factory the first time the
 * module is imported, so the list is the import order the registry under test actually caused.
 */
const loaded = vi.hoisted(() => ({ modules: [] as string[], alpmAttempts: 0 }));

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

vi.mock("../../src/registries/npm.ts", () => {
  loaded.modules.push("npm");
  return { NpmRegistry: stubAdapter("npm") };
});
vi.mock("../../src/registries/cargo.ts", () => {
  loaded.modules.push("cargo");
  return { CargoRegistry: stubAdapter("cargo") };
});
vi.mock("../../src/registries/pypi.ts", () => {
  loaded.modules.push("pypi");
  return { PyPIRegistry: stubAdapter("pypi") };
});
vi.mock("../../src/registries/rubygems.ts", () => {
  loaded.modules.push("gem");
  return { RubyGemsRegistry: stubAdapter("gem") };
});
vi.mock("../../src/registries/packagist.ts", () => {
  loaded.modules.push("composer");
  return { PackagistRegistry: stubAdapter("composer") };
});
vi.mock("../../src/registries/alpm.ts", () => {
  loaded.alpmAttempts += 1;
  if (loaded.alpmAttempts === 1) throw new Error("alpm failed to evaluate");
  loaded.modules.push("alpm");
  return { AlpmRegistry: stubAdapter("alpm") };
});

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

  it("should reuse the loaded class for the next instance", async () => {
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

  /** vitest reports a throwing factory with its own message, so only the rejection is pinned. */
  it("should retry an adapter whose import failed", async () => {
    await expect(create("alpm")).rejects.toThrow();

    const registry = await create("alpm");
    expect(registry.ecosystem()).toBe("alpm");
    expect(loaded.alpmAttempts).toBe(2);
  });
});

describe("package sideEffects", () => {
  /** Nothing registers at import anymore, so a bundler may drop every unused module of dist. */
  it("should declare the package free of import side effects", () => {
    const manifest = JSON.parse(
      readFileSync(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf8"),
    ) as { sideEffects: unknown };

    expect(manifest.sideEffects).toBe(false);
  });
});
