import type { ToolDefinition, ToolResult } from "@agntn/tools";
import { registriesTools } from "../../../src/tools.ts";
import { admitQueries, RATE_LIMIT, siteClient } from "./query";

/** Where a refused call can still go: the same tools, run locally. */
const LOCAL_HINT = "or run npx -y @agntn/registries mcp, which asks the registries from your machine";

/**
 * Queries a call spends from {@link RATE_LIMIT}: one per PURL, none for the ecosystem list.
 *
 * @param {string} name - The tool's name.
 * @param {unknown} args - The arguments, already checked against the tool's schema.
 * @returns {number} How many queries to spend.
 */
function queryCost(name: string, args: unknown): number {
  if (name === "registries_ecosystems") return 0;
  const purls = typeof args === "object" && args !== null && "purls" in args ? args.purls : undefined;
  return name === "registries_bulk_packages" && Array.isArray(purls) ? Math.max(1, purls.length) : 1;
}

function refusal(...lines: string[]): ToolResult {
  return { content: [{ type: "text", text: lines.join("\n") }], details: undefined, isError: true };
}

/**
 * Why this worker turns down a call `registries mcp` would run, if it does.
 *
 * @param {string} name - The tool's name.
 * @param {unknown} args - The arguments, already checked against the tool's schema.
 * @returns {Promise<ToolResult | undefined>} The refusal, or nothing when the call may run.
 */
async function siteRefusal(name: string, args: unknown): Promise<ToolResult | undefined> {
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
 * The `registries mcp` tools for this worker: same names, schemas and text, the site's client, and
 * the rate limit checked once the arguments pass.
 *
 * @returns {ToolDefinition[]} The six tools, each behind {@link siteRefusal}.
 */
export function siteTools(): ToolDefinition[] {
  const tools: readonly ToolDefinition[] = registriesTools({ client: siteClient() });
  return tools.map((tool): ToolDefinition => ({
    ...tool,
    async execute(args, context) {
      return (await siteRefusal(tool.name, args)) ?? tool.execute(args, context);
    },
  }));
}
