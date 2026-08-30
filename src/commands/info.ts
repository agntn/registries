import type { Package } from "../core/types.ts";
import type { Registry } from "../core/registry.ts";
import { defineCommand } from "citty";
import consola from "consola";
import { resolveDocsUrl } from "../helpers.ts";
import { sharedArgs, resolvePURL, withErrorHandling } from "./shared.ts";

export function outputPackageInfo(pkg: Package, name: string, reg: Registry): void {
  const urls = reg.urls();
  const registryUrl = urls.registry(name);
  const docsUrl = resolveDocsUrl(pkg, urls, pkg.latestVersion || undefined);
  const showDocs = shouldShowDocs(docsUrl, pkg, registryUrl);

  consola.log("");
  consola.log(
    `  \x1B[1m\x1B[36m${pkg.name}\x1B[0m${pkg.latestVersion ? `\x1B[90m@${pkg.latestVersion}\x1B[0m` : ""}`,
  );
  if (pkg.description) {
    consola.log(`  ${pkg.description}`);
  }
  consola.log("");

  const rows = [
    ["License:", "    ", pkg.licenses, Boolean(pkg.licenses)],
    ["Repository:", " ", pkg.repository, Boolean(pkg.repository)],
    ["Homepage:", "   ", pkg.homepage, Boolean(pkg.homepage)],
    ["Docs:", "       ", docsUrl, showDocs],
    ["Registry:", "   ", registryUrl, true],
    ["Keywords:", "   ", pkg.keywords.join(", "), pkg.keywords.length > 0],
    ["Namespace:", "  ", pkg.namespace, Boolean(pkg.namespace)],
    ["Ecosystem:", "  ", reg.ecosystem(), true],
  ] as const;

  for (const [label, spacing, value, visible] of rows) {
    if (visible) consola.log(`  \x1B[90m${label}\x1B[0m${spacing}${value}`);
  }
  consola.log("");
}

function shouldShowDocs(
  docsUrl: string,
  pkg: Readonly<Pick<Package, "homepage" | "repository">>,
  registryUrl: string,
): boolean {
  return Boolean(docsUrl) && ![pkg.homepage, pkg.repository, registryUrl].includes(docsUrl);
}

export default defineCommand({
  meta: {
    name: "info",
    description: "Show package metadata",
  },
  args: {
    ...sharedArgs,
    purl: {
      type: "positional",
      description: "Package PURL (e.g. pkg:npm/lodash, cargo/serde@1.0)",
      required: true,
    },
  },
  async run({ args }) {
    await withErrorHandling(async () => {
      const [reg, name] = resolvePURL(args.purl, !args["no-cache"]);
      const pkg = await reg.fetchPackage(name);

      if (args.json) {
        console.log(JSON.stringify(pkg, null, 2));
        return;
      }

      outputPackageInfo(pkg, name, reg);
    });
  },
});
