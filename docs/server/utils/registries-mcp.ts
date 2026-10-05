import { callTool, toolListings } from "@agntn/registries/mcp";
import {
  defineMcpTool,
  type McpToolDefinition,
  type McpToolDefinitionListItem,
} from "@nuxtjs/mcp-toolkit/server";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { admitQueries, RATE_LIMIT, siteClient } from "./query";

/** Where a refused call can still go: the same tools, run locally. */
const LOCAL_HINT = "or run npx -y @agntn/registries mcp, which asks the registries from your machine";

/**
 * Queries a call spends from {@link RATE_LIMIT}: one per PURL, none for the ecosystem list.
 *
 * @param {string} name - The tool's name.
 * @param {Readonly<Record<string, unknown>>} args - The arguments the client sent.
 * @returns {number} How many queries to spend.
 */
function queryCost(name: string, args: Readonly<Record<string, unknown>>): number {
  if (name === "registries_ecosystems") return 0;
  const purls = args["purls"];
  return name === "registries_bulk_packages" && Array.isArray(purls) ? Math.max(1, purls.length) : 1;
}

function refusal(...lines: string[]): CallToolResult {
  return { content: [{ type: "text", text: lines.join("\n") }], isError: true };
}

/**
 * Why this worker turns down a call `registries mcp` would run, if it does.
 *
 * @param {string} name - The tool's name.
 * @param {Readonly<Record<string, unknown>>} args - The arguments the client sent.
 * @returns {Promise<CallToolResult | undefined>} The refusal, or nothing when the call may run.
 */
async function siteRefusal(
  name: string,
  args: Readonly<Record<string, unknown>>,
): Promise<CallToolResult | undefined> {
  const cost = queryCost(name, args);
  if (cost > RATE_LIMIT) {
    return refusal(
      `${name} failed: this server answers at most ${RATE_LIMIT} new registry queries a minute, and this call needs ${cost}`,
      `Split the list into calls of ${RATE_LIMIT} PURLs or fewer, ${LOCAL_HINT}`,
    );
  }
  if (cost > 0 && !(await admitQueries(useEvent(), cost))) {
    return refusal(
      `${name} failed: more than ${RATE_LIMIT} new registry queries in a minute from one address, or one /64 on IPv6`,
      `Wait a minute and call again, ${LOCAL_HINT}`,
    );
  }
  return undefined;
}

/**
 * A `registries mcp` tool for Docus: its own schema in `tools/list`, the worker's limit and client on the call.
 *
 * @param {string} name - The tool's name, such as `registries_package`.
 * @returns {McpToolDefinitionListItem} The tool definition for `server/mcp/tools/`.
 */
export function registriesMcpTool(name: string): McpToolDefinitionListItem {
  const listing = toolListings.find((candidate) => candidate.name === name);
  if (listing === undefined) {
    throw new Error(`Unknown registries tool: ${name}`);
  }
  /** Any object passes Zod, so `callTool` refuses a bad one in the library's words. */
  const schema = z.looseObject({});
  schema._zod.toJSONSchema = () => ({ ...listing.inputSchema });
  /** The SDK hands Zod a missing `arguments` untouched, so read it as the `{}` stdio gets. */
  const run = schema._zod.run.bind(schema._zod);
  schema._zod.run = (payload, context) =>
    run(payload.value === undefined ? { ...payload, value: {} } : payload, context);
  /** The toolkit types a raw shape only, and the SDK behind it takes a whole object too. */
  const inputSchema = schema as unknown as NonNullable<McpToolDefinition["inputSchema"]>;
  return defineMcpTool({
    name: listing.name,
    title: listing.title,
    description: listing.description,
    annotations: listing.annotations,
    inputSchema,
    handler: async (args: Readonly<Record<string, unknown>>, extra) =>
      (await siteRefusal(name, args)) ?? callTool(name, args, extra.signal, siteClient()),
  });
}
