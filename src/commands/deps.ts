import { sanitizeLine, type ToolResult } from "@agntn/tools";
import { PkioError } from "../core/errors.ts";
import type { Dependency } from "../core/types.ts";
import { answer, linesResult, resolvePURL, type LookupArgs } from "./shared.ts";

/**
 * Dependencies grouped by scope, runtime first as the registry lists them.
 *
 * @param name - Package name.
 * @param version - The release they belong to.
 * @param deps - The dependencies.
 * @returns {string[]} The lines, without colors.
 */
export function dependencyLines(
  name: string,
  version: string,
  deps: readonly Dependency[],
): string[] {
  const head = sanitizeLine(`${name}@${version}`);
  const lines = [`${head}: ${deps.length} dependenc${deps.length === 1 ? "y" : "ies"}`];
  for (const [scope, scopeDeps] of Map.groupBy(deps, (dep) => dep.scope || "runtime")) {
    lines.push("", `${sanitizeLine(scope)} (${scopeDeps.length})`);
    for (const dep of scopeDeps) {
      const words = [dep.name, dep.requirements, dep.optional ? "(optional)" : ""];
      lines.push(`  ${sanitizeLine(words.filter(Boolean).join(" "))}`);
    }
  }
  return lines;
}

/**
 * `registries deps`: one release's dependencies, the latest when the PURL names none.
 *
 * @param args - The package and the cache switch.
 * @returns {Promise<ToolResult<Dependency[] | undefined>>} The list over the dependencies.
 */
export function deps(args: LookupArgs): Promise<ToolResult<Dependency[] | undefined>> {
  return answer(async () => {
    const [reg, name, version] = await resolvePURL(args.purl, args.cache);
    if (version) {
      const found = await reg.fetchDependencies(name, version);
      return linesResult(dependencyLines(name, version, found), found);
    }
    const latest = (await reg.fetchPackage(name)).latestVersion;
    if (!latest) {
      throw new PkioError(
        "PURL must include a version for dependency lookup, and no latest version found. Example: pkg:npm/lodash@4.17.21",
      );
    }
    const found = await reg.fetchDependencies(name, latest);
    return linesResult(
      [
        `No version specified, using latest: ${sanitizeLine(latest)}`,
        ...dependencyLines(name, latest, found),
      ],
      found,
    );
  });
}
