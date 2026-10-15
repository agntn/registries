import type { TSchema } from "typebox";
import { Value } from "typebox/value";
import type { ExtensionAPI, ExtensionContext, ToolDefinition } from "@oh-my-pi/pi-coding-agent";
import registriesExtension from "../../extensions/omp/registries.ts";
import { registriesTools } from "../../src/tools.ts";

type OmpTool = ToolDefinition;

interface RegisteredExtension {
  readonly label: string | undefined;
  readonly tools: Map<string, OmpTool>;
}

/**
 * SAFETY: the fake host implements every registration capability used by the extension. Its
 * `Unsafe` hands the JSON Schema back as compiled OMP does, so the bounds are the shared ones.
 *
 * @returns {Promise<RegisteredExtension>} The captured extension label and tools.
 */
async function registerExtensionTools(): Promise<RegisteredExtension> {
  const tools = new Map<string, OmpTool>();
  let label: string | undefined;
  const api = {
    typebox: { Type: { Unsafe: (schema: unknown) => schema } },
    pi: { Text: class {} },
    setLabel(value: string) {
      label = value;
    },
    registerTool(tool: ToolDefinition) {
      tools.set(tool.name, tool);
    },
  };

  await registriesExtension(api as unknown as ExtensionAPI);
  return { label, tools };
}

/**
 * SAFETY: the fake `Unsafe` registered the shared TypeBox schema unchanged.
 *
 * @param tool - Registered OMP tool.
 * @param value - Candidate arguments.
 * @returns {boolean} Whether the arguments satisfy the tool schema.
 */
function accepts(tool: ToolDefinition, value: unknown): boolean {
  return Value.Check(tool.parameters as unknown as TSchema, value);
}

/** SAFETY: the exercised executors do not read their extension context. */
const unusedContext = {} as ExtensionContext;

describe("registries OMP extension", () => {
  it("registers the complete read-only tool set", async () => {
    const { label, tools } = await registerExtensionTools();

    expect(label).toBe("Registries");
    expect([...tools.keys()]).toEqual([
      "registries_package",
      "registries_versions",
      "registries_dependencies",
      "registries_maintainers",
      "registries_bulk_packages",
      "registries_ecosystems",
    ]);
    for (const tool of tools.values()) expect(tool.approval).toBe("read");
  });

  it("bounds bulk package lookups", async () => {
    const tool = (await registerExtensionTools()).tools.get("registries_bulk_packages");
    if (!tool) throw new Error("Tool not registered: registries_bulk_packages");
    const purls = ["pkg:npm/lodash"];

    expect(accepts(tool, { purls, concurrency: 1 })).toBe(true);
    expect(accepts(tool, { purls, concurrency: 50 })).toBe(true);
    expect(accepts(tool, { purls: [] })).toBe(false);
    expect(accepts(tool, { purls, concurrency: 51 })).toBe(false);
    expect(accepts(tool, { purls, concurrency: 1.5 })).toBe(false);
  });

  it("should take a positive integer or all as the version limit", async () => {
    const tool = (await registerExtensionTools()).tools.get("registries_versions");
    if (!tool) throw new Error("Tool not registered: registries_versions");
    const purl = "pkg:npm/lodash";

    expect(accepts(tool, { purl })).toBe(true);
    expect(accepts(tool, { purl, limit: 1 })).toBe(true);
    expect(accepts(tool, { purl, limit: "all" })).toBe(true);
    expect(accepts(tool, { purl, limit: 0 })).toBe(false);
    expect(accepts(tool, { purl, limit: 1.5 })).toBe(false);
    expect(accepts(tool, { purl, limit: "ALL" })).toBe(false);
    expect(accepts(tool, { purl, max: 5 })).toBe(false);
  });

  it("should register the schema every surface shares", async () => {
    const { tools } = await registerExtensionTools();
    for (const definition of registriesTools()) {
      expect(tools.get(definition.name)?.parameters).toEqual(definition.input);
    }
  });

  it("discovers ecosystems without network access", async () => {
    const tool = (await registerExtensionTools()).tools.get("registries_ecosystems");
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
