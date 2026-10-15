import type {
  ExtensionAPI,
  ExtensionContext,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import type { TSchema } from "typebox";
import { Value } from "typebox/value";
import registriesExtension from "../../packages/pi/extensions/registries.ts";
import { registriesTools } from "../../src/tools.ts";

type PiTool = ToolDefinition<TSchema, unknown, unknown>;

/**
 * SAFETY: the extension only uses registerTool while it registers itself.
 *
 * @returns {Promise<Map<string, PiTool>>} Tools captured from the extension.
 */
async function registerExtensionTools(): Promise<Map<string, PiTool>> {
  const tools = new Map<string, PiTool>();
  const api = {
    registerTool(tool: ToolDefinition<TSchema, unknown, unknown>) {
      tools.set(tool.name, tool);
    },
  };

  await registriesExtension(api as unknown as ExtensionAPI);
  return tools;
}

/** SAFETY: the exercised executors do not read their extension context. */
const unusedContext = {} as ExtensionContext;

describe("registries Pi extension", () => {
  it("registers the complete tool set", async () => {
    expect([...(await registerExtensionTools()).keys()]).toEqual([
      "registries_package",
      "registries_versions",
      "registries_dependencies",
      "registries_maintainers",
      "registries_bulk_packages",
      "registries_ecosystems",
    ]);
  });

  it("names each tool in every prompt guideline", async () => {
    for (const tool of (await registerExtensionTools()).values()) {
      expect(tool.promptGuidelines).not.toHaveLength(0);
      for (const guideline of tool.promptGuidelines ?? []) expect(guideline).toContain(tool.name);
    }
  });

  it("bounds bulk package lookups", async () => {
    const tool = (await registerExtensionTools()).get("registries_bulk_packages");
    if (!tool) throw new Error("Tool not registered: registries_bulk_packages");
    const purls = ["pkg:npm/lodash"];

    expect(Value.Check(tool.parameters, { purls, concurrency: 1 })).toBe(true);
    expect(Value.Check(tool.parameters, { purls, concurrency: 50 })).toBe(true);
    expect(Value.Check(tool.parameters, { purls: [] })).toBe(false);
    expect(Value.Check(tool.parameters, { purls, concurrency: 51 })).toBe(false);
    expect(Value.Check(tool.parameters, { purls, concurrency: 1.5 })).toBe(false);
  });

  it("should take a positive integer or all as the version limit", async () => {
    const tool = (await registerExtensionTools()).get("registries_versions");
    if (!tool) throw new Error("Tool not registered: registries_versions");
    const purl = "pkg:npm/lodash";

    expect(Value.Check(tool.parameters, { purl })).toBe(true);
    expect(Value.Check(tool.parameters, { purl, limit: 1 })).toBe(true);
    expect(Value.Check(tool.parameters, { purl, limit: "all" })).toBe(true);
    expect(Value.Check(tool.parameters, { purl, limit: 0 })).toBe(false);
    expect(Value.Check(tool.parameters, { purl, limit: 1.5 })).toBe(false);
    expect(Value.Check(tool.parameters, { purl, limit: "ALL" })).toBe(false);
    expect(Value.Check(tool.parameters, { purl, max: 5 })).toBe(false);
  });

  it("should register the schema every surface shares", async () => {
    const tools = await registerExtensionTools();
    for (const definition of registriesTools()) {
      expect(tools.get(definition.name)?.parameters).toEqual(definition.input);
    }
  });

  it("should refuse a bad call in the core when Pi skips its own check", async () => {
    const tool = (await registerExtensionTools()).get("registries_bulk_packages");
    if (!tool) throw new Error("Tool not registered: registries_bulk_packages");

    await expect(
      tool.execute("test", { purls: [] }, undefined, undefined, unusedContext),
    ).rejects.toThrow("/purls");
  });

  it("discovers ecosystems without network access", async () => {
    const tool = (await registerExtensionTools()).get("registries_ecosystems");
    if (!tool) throw new Error("Tool not registered: registries_ecosystems");
    const result = await tool.execute("test", {}, undefined, undefined, unusedContext);

    const content = result.content[0];
    expect(content?.type).toBe("text");
    if (content?.type !== "text") throw new Error("Expected text tool content");
    expect(content.text).toBe('{"ecosystems":["alpm","cargo","composer","gem","npm","pypi"]}');
    expect(result.details).toEqual({
      ecosystems: ["alpm", "cargo", "composer", "gem", "npm", "pypi"],
    });
  });
});
