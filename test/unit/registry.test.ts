import { Client } from "../../src/core/client.ts";
import { UnknownEcosystemError } from "../../src/core/errors.ts";
import { Registry, create, ecosystems, has, register } from "../../src/core/registry.ts";

class TestRegistry extends Registry {
  constructor(baseURL: string, client: unknown) {
    super();
    this.baseURL = baseURL;
    this.client = client;
  }

  readonly baseURL: string;
  readonly client: unknown;

  ecosystem(): string {
    return "test";
  }

  async fetchPackage() {
    return {
      name: "",
      description: "",
      homepage: "",
      documentation: "",
      repository: "",
      licenses: "",
      keywords: [],
      namespace: "",
      latestVersion: "",
      metadata: {},
    };
  }

  async fetchVersions() {
    return [];
  }

  async fetchDependencies() {
    return [];
  }

  async fetchMaintainers() {
    return [];
  }

  urls() {
    return {
      registry: () => this.baseURL,
      download: () => "",
      documentation: () => "",
      readme: () => "",
      purl: () => "",
    };
  }
}

describe("registry", () => {
  it("should register a registry class", () => {
    register("test", "https://register.example.com", TestRegistry);

    expect(has("test")).toBe(true);
  });

  it("should instantiate the registered class", async () => {
    register("test", "https://create.example.com", TestRegistry);

    const registry = await create("test");
    expect(registry).toBeInstanceOf(TestRegistry);
    expect(registry.ecosystem()).toBe("test");
  });

  it("should use the default base URL", async () => {
    register("test", "https://default.example.com", TestRegistry);

    expect((await create("test")).urls().registry("package")).toBe("https://default.example.com");
  });

  it("should use a custom base URL", async () => {
    register("test", "https://default.example.com", TestRegistry);

    const registry = await create("test", "https://custom.example.com");
    expect(registry.urls().registry("package")).toBe("https://custom.example.com");
  });

  it("should pass a custom client to the class", async () => {
    register("test", "https://client.example.com", TestRegistry);
    const client = new Client();

    expect(await create("test", undefined, client)).toMatchObject({ client });
  });

  it("should list registered ecosystems", () => {
    register("test", "https://ecosystems.example.com", TestRegistry);

    expect(ecosystems()).toEqual(expect.arrayContaining(["test"]));
  });

  it("should treat ecosystem names as case-sensitive", () => {
    register("test", "https://case.example.com", TestRegistry);

    expect(has("test")).toBe(true);
    expect(has("TEST")).toBe(false);
  });

  it("should reject an unregistered ecosystem", async () => {
    await expect(create("nonexistent-ecosystem")).rejects.toThrow(UnknownEcosystemError);
  });

  it("should include the ecosystem in an unknown-ecosystem error", async () => {
    expect.assertions(2);

    try {
      await create("unknown-eco");
    } catch (error) {
      expect(error).toBeInstanceOf(UnknownEcosystemError);
      if (!(error instanceof UnknownEcosystemError)) throw error;
      expect(error.ecosystem).toBe("unknown-eco");
    }
  });
});
