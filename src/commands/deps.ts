import { defineCommand } from "citty";
import consola from "consola";
import { sharedArgs, resolvePURL, withErrorHandling } from "./shared.ts";

export default defineCommand({
  meta: {
    name: "deps",
    description: "List package dependencies",
  },
  args: {
    ...sharedArgs,
    purl: {
      type: "positional",
      description: "Package PURL with version (e.g. pkg:npm/lodash@4.17.21, cargo/serde@1.0)",
      required: true,
    },
  },
  async run({ args }) {
    await withErrorHandling(async () => {
      const [reg, name, version] = resolvePURL(args.purl, !args["no-cache"]);

      if (!version) {
        // Try to resolve latest version
        const pkg = await reg.fetchPackage(name);
        if (!pkg.latestVersion) {
          consola.error(
            "PURL must include a version for dependency lookup, and no latest version found.",
          );
          consola.info("Example: pkg:npm/lodash@4.17.21");
          process.exit(1);
        }
        if (!args.json) {
          consola.info(`No version specified, using latest: ${pkg.latestVersion}`);
        }
        const deps = await reg.fetchDependencies(name, pkg.latestVersion);
        outputDeps(name, pkg.latestVersion, deps, args.json);
        return;
      }

      const deps = await reg.fetchDependencies(name, version);
      outputDeps(name, version, deps, args.json);
    });
  },
});

import type { Dependency } from "../core/types.ts";

function outputDeps(
  name: string,
  version: string,
  deps: readonly Dependency[],
  json: boolean,
): void {
  if (json) {
    console.log(JSON.stringify(deps, null, 2));
    return;
  }

  consola.log("");
  consola.log(
    `  \x1B[1m${name}@${version}\x1B[0m — ${deps.length} dependenc${deps.length === 1 ? "y" : "ies"}`,
  );
  consola.log("");

  const byScope = groupByScope(deps);

  const scopeColors: Record<string, string> = {
    runtime: "\x1B[32m",
    development: "\x1B[33m",
    build: "\x1B[35m",
    test: "\x1B[36m",
    optional: "\x1B[90m",
  };

  for (const [scope, scopeDeps] of byScope) {
    const color = scopeColors[scope] ?? "\x1B[0m";
    consola.log(`  ${color}${scope}\x1B[0m (${scopeDeps.length})`);
    for (const dep of scopeDeps) {
      const opt = dep.optional ? " \x1B[90m(optional)\x1B[0m" : "";
      consola.log(`    ${dep.name} \x1B[90m${dep.requirements}\x1B[0m${opt}`);
    }
    consola.log("");
  }
}

function groupByScope(deps: readonly Dependency[]): Map<string, Dependency[]> {
  const byScope = new Map<string, Dependency[]>();

  for (const dep of deps) {
    const scope = dep.scope || "runtime";
    const scopeDeps = byScope.get(scope) ?? [];
    scopeDeps.push(dep);
    byScope.set(scope, scopeDeps);
  }

  return byScope;
}
