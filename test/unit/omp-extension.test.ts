import * as TypeBox from "@oh-my-pi/omptype/typebox";
import type { ExtensionAPI, ExtensionContext, ToolDefinition } from "@oh-my-pi/pi-coding-agent";
import registriesExtension from "../../packages/omp/extensions/registries.ts";

type OmpTool = ToolDefinition;

interface RegisteredExtension {
  readonly label: string | undefined;
  readonly tools: Map<string, OmpTool>;
}

/**
 * SAFETY: the fake host implements every registration capability used by the extension.
 *
 * @returns {RegisteredExtension} The captured extension label and tools.
 */
function registerExtensionTools(): RegisteredExtension {
  const tools = new Map<string, OmpTool>();
  let label: string | undefined;
  const api = {
    typebox: TypeBox,
    setLabel(value: string) {
      label = value;
    },
    registerTool(tool: ToolDefinition) {
      tools.set(tool.name, tool);
    },
  };

  registriesExtension(api as unknown as ExtensionAPI);
  return { label, tools };
}

/**
 * SAFETY: OMP's injected TypeBox facade created this schema.
 *
 * @param tool - Registered OMP tool.
 * @param value - Candidate arguments.
 * @returns {boolean} Whether the arguments satisfy the tool schema.
 */
function accepts(tool: ToolDefinition, value: unknown): boolean {
  return (tool.parameters as unknown as TypeBox.TSchema).safeParse(value).success;
}

/** SAFETY: the exercised executors do not read their extension context. */
const unusedContext = {} as ExtensionContext;

describe("registries OMP extension", () => {
  it("registers the complete read-only tool set", () => {
    const { label, tools } = registerExtensionTools();

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

  it("bounds bulk package lookups", () => {
    const tool = registerExtensionTools().tools.get("registries_bulk_packages");
    if (!tool) throw new Error("Tool not registered: registries_bulk_packages");
    const purls = ["pkg:npm/lodash"];

    expect(accepts(tool, { purls, concurrency: 1 })).toBe(true);
    expect(accepts(tool, { purls, concurrency: 50 })).toBe(true);
    expect(accepts(tool, { purls: [] })).toBe(false);
    expect(accepts(tool, { purls, concurrency: 51 })).toBe(false);
    expect(accepts(tool, { purls, concurrency: 1.5 })).toBe(false);
  });

  it("discovers ecosystems without network access", async () => {
    const tool = registerExtensionTools().tools.get("registries_ecosystems");
    if (!tool) throw new Error("Tool not registered: registries_ecosystems");
    const result = await tool.execute("test", {}, undefined, undefined, unusedContext);

    const content = result.content[0];
    expect(content?.type).toBe("text");
    if (content?.type !== "text") throw new Error("Expected text tool content");
    expect(content.text).toContain('"npm"');
  });
});
