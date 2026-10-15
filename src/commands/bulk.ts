import type { ToolResult } from "@agntn/tools";
import type { Package } from "../core/types.ts";
import { bulkPackagesOperation } from "../tool-operations.ts";
import { withScheme } from "./shared.ts";

/**
 * `registries bulk`: the bulk tool, with the shorthand PURLs every other command takes.
 *
 * @param args - The packages and how many lookups run at once.
 * @returns {Promise<ToolResult<Record<string, Package>>>} One package per PURL that answered.
 */
export function bulk(args: {
  readonly purls: readonly string[];
  readonly concurrency?: number;
}): Promise<ToolResult<Record<string, Package>>> {
  return bulkPackagesOperation({ ...args, purls: args.purls.map(withScheme) });
}
