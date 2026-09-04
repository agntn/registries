import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
  type ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import { Type, type Static, type TSchema } from "typebox";
import {
  bulkPackagesOperation,
  dependenciesOperation,
  ecosystemsOperation,
  maintainersOperation,
  MAX_BULK_CONCURRENCY,
  MAX_BULK_PACKAGES,
  MAX_PURL_LENGTH,
  packageOperation,
  type ToolResult,
  versionsOperation,
} from "./tool-operations.ts";
import { version } from "./version.ts";

const PURL = Type.String({
  minLength: 1,
  maxLength: MAX_PURL_LENGTH,
  description: "Package URL, for example pkg:npm/lodash or pkg:pypi/requests@2.32.3",
});

const PURLParams = Type.Object({ purl: PURL }, { additionalProperties: false });
const BulkPackagesParams = Type.Object(
  {
    purls: Type.Array(PURL, { minItems: 1, maxItems: MAX_BULK_PACKAGES }),
    concurrency: Type.Optional(Type.Integer({ minimum: 1, maximum: MAX_BULK_CONCURRENCY })),
  },
  { additionalProperties: false },
);
const EmptyParams = Type.Object({}, { additionalProperties: false });

const REMOTE_READ: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};
const LOCAL_READ: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

interface RegistryTool<S extends TSchema> {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: S;
  readonly annotations: ToolAnnotations;
  execute(params: Readonly<Static<S>>, signal?: AbortSignal): Promise<ToolResult<unknown>>;
}

function defineTool<S extends TSchema>(tool: Readonly<RegistryTool<S>>): RegistryTool<S> {
  return tool;
}

const tools = [
  defineTool({
    name: "registries_package",
    title: "Get package metadata",
    description: "Fetch normalized metadata for one package URL.",
    inputSchema: PURLParams,
    annotations: REMOTE_READ,
    execute: packageOperation,
  }),
  defineTool({
    name: "registries_versions",
    title: "List package versions",
    description: "List normalized versions for one package URL.",
    inputSchema: PURLParams,
    annotations: REMOTE_READ,
    execute: versionsOperation,
  }),
  defineTool({
    name: "registries_dependencies",
    title: "List package dependencies",
    description: "List dependencies for a versioned package URL.",
    inputSchema: PURLParams,
    annotations: REMOTE_READ,
    execute: dependenciesOperation,
  }),
  defineTool({
    name: "registries_maintainers",
    title: "List package maintainers",
    description: "List normalized maintainers for one package URL.",
    inputSchema: PURLParams,
    annotations: REMOTE_READ,
    execute: maintainersOperation,
  }),
  defineTool({
    name: "registries_bulk_packages",
    title: "Get package metadata in bulk",
    description: "Fetch normalized package metadata for up to 50 package URLs.",
    inputSchema: BulkPackagesParams,
    annotations: REMOTE_READ,
    execute: bulkPackagesOperation,
  }),
  defineTool({
    name: "registries_ecosystems",
    title: "List registry ecosystems",
    description: "List package ecosystems registered by this package.",
    inputSchema: EmptyParams,
    annotations: LOCAL_READ,
    execute: ecosystemsOperation,
  }),
] as const;

type AnyRegistryTool = (typeof tools)[number];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sanitizeField(value: string): string {
  return Array.from(value)
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code <= 31 || (code >= 127 && code <= 159) ? " " : character;
    })
    .join("");
}

function errorResult(text: string): CallToolResult {
  return { content: [{ type: "text", text: sanitizeField(text) }], isError: true };
}

function toCallToolResult(result: ToolResult<unknown>): CallToolResult {
  return { content: result.content, ...(result.isError ? { isError: true } : {}) };
}

/**
 * SAFETY: TypeBox schemas conform to the JSON Schema object accepted by MCP.
 *
 * @param schema - TypeBox schema to expose through MCP.
 * @returns {Tool["inputSchema"]} The same schema under the MCP SDK type.
 */
function toMcpSchema(schema: TSchema): Tool["inputSchema"] {
  return schema as unknown as Tool["inputSchema"];
}

export function createMcpServer(): Server {
  const toolsByName = new Map<string, AnyRegistryTool>(tools.map((tool) => [tool.name, tool]));
  const server = new Server({ name: "registries", version }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: tools.map((tool): Tool => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: toMcpSchema(tool.inputSchema),
      annotations: tool.annotations,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const tool = toolsByName.get(request.params.name);
    if (!tool) return errorResult(`Unknown registries tool: ${request.params.name}`);

    const args = request.params.arguments ?? {};
    const { Value } = await import("typebox/value");
    if (!Value.Check(tool.inputSchema, args)) {
      return errorResult(`Invalid arguments for ${tool.name}`);
    }

    try {
      /** SAFETY: Value.Check validated args against the selected tool's schema. */
      const validatedArgs = args as never;
      return toCallToolResult(await tool.execute(validatedArgs, extra.signal));
    } catch (error) {
      return errorResult(`${tool.name} failed: ${errorMessage(error)}`);
    }
  });

  return server;
}
