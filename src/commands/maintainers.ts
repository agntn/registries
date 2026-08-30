import type { Maintainer } from "../core/types.ts";
import { defineCommand } from "citty";
import consola from "consola";
import { sharedArgs, resolvePURL, withErrorHandling } from "./shared.ts";

export default defineCommand({
  meta: {
    name: "maintainers",
    description: "List package maintainers",
  },
  args: {
    ...sharedArgs,
    purl: {
      type: "positional",
      description: "Package PURL (e.g. pkg:npm/lodash, gem/rails)",
      required: true,
    },
  },
  async run({ args }) {
    await withErrorHandling(async () => {
      const [reg, name] = resolvePURL(args.purl, !args["no-cache"]);
      const maintainers = await reg.fetchMaintainers(name);

      if (args.json) {
        console.log(JSON.stringify(maintainers, null, 2));
        return;
      }

      outputMaintainers(name, maintainers);
    });
  },
});

function outputMaintainers(name: string, maintainers: readonly Maintainer[]): void {
  consola.log("");
  consola.log(
    `  \x1B[1m${name}\x1B[0m — ${maintainers.length} maintainer${maintainers.length === 1 ? "" : "s"}`,
  );
  consola.log("");

  for (const maintainer of maintainers) {
    consola.log(`  ${formatMaintainer(maintainer).join(" ")}`);
    if (maintainer.url) consola.log(`    \x1B[90m${maintainer.url}\x1B[0m`);
  }
  consola.log("");
}

function formatMaintainer(maintainer: Readonly<Maintainer>): string[] {
  const displayName = maintainer.name || maintainer.login || "unknown";
  const parts = [displayName];

  if (maintainer.login && maintainer.login !== displayName) {
    parts.push(`\x1B[90m(${maintainer.login})\x1B[0m`);
  }
  if (maintainer.email) parts.push(`\x1B[90m<${maintainer.email}>\x1B[0m`);
  if (maintainer.role) parts.push(`\x1B[36m[${maintainer.role}]\x1B[0m`);

  return parts;
}
