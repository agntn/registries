import { sanitizeLine, type ToolResult } from "@agntn/tools";
import type { Version } from "../core/types.ts";
import { selectRecentVersions } from "../helpers.ts";
import { DEFAULT_VERSIONS_LIMIT } from "../tool-limits.ts";
import { answer, linesResult, resolvePURL, type LookupArgs } from "./shared.ts";

/** `registries versions` takes a cap too, or `all` for the whole history. */
export interface VersionsArgs extends LookupArgs {
  readonly limit?: number | "all";
}

/**
 * One line per release, newest first, and a note on how many the cap left out.
 *
 * @param name - Package name.
 * @param all - Every version the registry knows.
 * @param shown - The ones that made the cut.
 * @returns {string[]} The lines, without colors.
 */
export function versionLines(
  name: string,
  all: readonly Version[],
  shown: readonly Version[],
): string[] {
  const lines = [`${sanitizeLine(name)}: ${all.length} version${all.length === 1 ? "" : "s"}`, ""];
  for (const version of shown) {
    const status = version.status ? ` [${sanitizeLine(version.status)}]` : "";
    const date = version.publishedAt ? `  ${version.publishedAt.toISOString().slice(0, 10)}` : "";
    lines.push(`${sanitizeLine(version.number)}${status}${date}`);
  }
  const omitted = all.length - shown.length;
  if (omitted > 0) lines.push("", `... and ${omitted} more (use --limit to show more)`);
  return lines;
}

/**
 * `registries versions`: the newest releases, the shown ones as an array under `--json`.
 *
 * @param args - The package, the cap and the cache switch.
 * @returns {Promise<ToolResult<Version[] | undefined>>} The list over the shown versions.
 */
export function versions(args: VersionsArgs): Promise<ToolResult<Version[] | undefined>> {
  return answer(async () => {
    const [reg, name] = await resolvePURL(args.purl, args.cache);
    const all = await reg.fetchVersions(name);
    const limit = args.limit === "all" ? Number.POSITIVE_INFINITY : args.limit;
    const shown = selectRecentVersions(all, limit ?? DEFAULT_VERSIONS_LIMIT);
    return linesResult(versionLines(name, all, shown), shown);
  });
}
