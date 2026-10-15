import { sanitizeLine, type ToolResult } from "@agntn/tools";
import type { Package } from "../core/types.ts";
import type { Registry } from "../core/registry.ts";
import { resolveDocsUrl } from "../helpers.ts";
import { answer, linesResult, resolvePURL, type LookupArgs } from "./shared.ts";

/**
 * The card `registries info` prints, one line per field whatever the registry put in it.
 *
 * @param pkg - The package.
 * @param name - Its name as the registry spells it.
 * @param reg - The registry it came from.
 * @returns {string[]} The lines, without colors.
 */
export function packageInfoLines(pkg: Package, name: string, reg: Registry): string[] {
  const urls = reg.urls();
  const registryUrl = urls.registry(name);
  const docsUrl = resolveDocsUrl(pkg, urls, pkg.latestVersion || undefined);
  const showDocs = shouldShowDocs(docsUrl, pkg, registryUrl);

  const lines = [sanitizeLine(`${pkg.name}${pkg.latestVersion ? `@${pkg.latestVersion}` : ""}`)];
  if (pkg.description) lines.push(sanitizeLine(pkg.description));
  lines.push("");

  const rows = [
    ["License:", pkg.licenses, Boolean(pkg.licenses)],
    ["Repository:", pkg.repository, Boolean(pkg.repository)],
    ["Homepage:", pkg.homepage, Boolean(pkg.homepage)],
    ["Docs:", docsUrl, showDocs],
    ["Registry:", registryUrl, true],
    ["Keywords:", pkg.keywords.join(", "), pkg.keywords.length > 0],
    ["Namespace:", pkg.namespace, Boolean(pkg.namespace)],
    ["Ecosystem:", reg.ecosystem(), true],
  ] as const;

  for (const [label, value, visible] of rows) {
    if (visible) lines.push(`${label.padEnd(12)}${sanitizeLine(value)}`);
  }
  return lines;
}

function shouldShowDocs(
  docsUrl: string,
  pkg: Readonly<Pick<Package, "homepage" | "repository">>,
  registryUrl: string,
): boolean {
  return Boolean(docsUrl) && ![pkg.homepage, pkg.repository, registryUrl].includes(docsUrl);
}

/**
 * `registries info`: the package card, or the package itself under `--json`.
 *
 * @param args - The package and the cache switch.
 * @returns {Promise<ToolResult<Package | undefined>>} The card over the package.
 */
export function info(args: LookupArgs): Promise<ToolResult<Package | undefined>> {
  return answer(async () => {
    const [reg, name] = await resolvePURL(args.purl, args.cache);
    const pkg = await reg.fetchPackage(name);
    return linesResult(packageInfoLines(pkg, name, reg), pkg);
  });
}
