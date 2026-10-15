import { sanitizeLine, type ToolResult } from "@agntn/tools";
import type { Maintainer } from "../core/types.ts";
import { answer, linesResult, resolvePURL, type LookupArgs } from "./shared.ts";

/**
 * One maintainer per line, their page indented under them.
 *
 * @param name - Package name.
 * @param maintainers - Who the registry lists.
 * @returns {string[]} The lines, without colors.
 */
export function maintainerLines(name: string, maintainers: readonly Maintainer[]): string[] {
  const lines = [
    `${sanitizeLine(name)}: ${maintainers.length} maintainer${maintainers.length === 1 ? "" : "s"}`,
    "",
  ];
  for (const maintainer of maintainers) {
    lines.push(sanitizeLine(formatMaintainer(maintainer).join(" ")));
    if (maintainer.url) lines.push(`  ${sanitizeLine(maintainer.url)}`);
  }
  return lines;
}

function formatMaintainer(maintainer: Readonly<Maintainer>): string[] {
  const displayName = maintainer.name || maintainer.login || "unknown";
  const parts = [displayName];

  if (maintainer.login && maintainer.login !== displayName) parts.push(`(${maintainer.login})`);
  if (maintainer.email) parts.push(`<${maintainer.email}>`);
  if (maintainer.role) parts.push(`[${maintainer.role}]`);

  return parts;
}

/**
 * `registries maintainers`: who the registry says owns the package.
 *
 * @param args - The package and the cache switch.
 * @returns {Promise<ToolResult<Maintainer[] | undefined>>} The list over the maintainers.
 */
export function maintainers(args: LookupArgs): Promise<ToolResult<Maintainer[] | undefined>> {
  return answer(async () => {
    const [reg, name] = await resolvePURL(args.purl, args.cache);
    const found = await reg.fetchMaintainers(name);
    return linesResult(maintainerLines(name, found), found);
  });
}
