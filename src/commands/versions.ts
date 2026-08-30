import { defineCommand } from "citty";
import consola from "consola";
import type { Version } from "../core/types.ts";

import { sharedArgs, resolvePURL, withErrorHandling } from "./shared.ts";
export function selectRecentVersions(versions: readonly Version[], limit: number): Version[] {
  return versions
    .toSorted((a, b) => {
      if (a.publishedAt === null) return b.publishedAt === null ? 0 : 1;
      if (b.publishedAt === null) return -1;
      return b.publishedAt.getTime() - a.publishedAt.getTime();
    })
    .slice(0, limit);
}

export default defineCommand({
  meta: {
    name: "versions",
    description: "List package versions",
  },
  args: {
    ...sharedArgs,
    purl: {
      type: "positional",
      description: "Package PURL (e.g. pkg:npm/lodash, cargo/serde)",
      required: true,
    },
    limit: {
      type: "string",
      alias: "l",
      description: "Max versions to show",
      default: "20",
    },
  },
  async run({ args }) {
    await withErrorHandling(async () => {
      const [reg, name] = resolvePURL(args.purl, !args["no-cache"]);
      const versions = await reg.fetchVersions(name);
      const limit = Number.parseInt(args.limit, 10) || 20;
      const shown = selectRecentVersions(versions, limit);

      if (args.json) {
        console.log(JSON.stringify(shown, null, 2));
        return;
      }

      consola.log("");
      consola.log(
        `  \x1B[1m${name}\x1B[0m — ${versions.length} version${versions.length === 1 ? "" : "s"}`,
      );
      consola.log("");

      for (const v of shown) {
        const status = v.status ? ` \x1B[33m[${v.status}]\x1B[0m` : "";
        const date = v.publishedAt
          ? `  \x1B[90m${v.publishedAt.toISOString().slice(0, 10)}\x1B[0m`
          : "";
        consola.log(`  ${v.number}${status}${date}`);
      }

      if (versions.length > limit) {
        consola.log(
          `\n  \x1B[90m... and ${versions.length - limit} more (use --limit to show more)\x1B[0m`,
        );
      }
      consola.log("");
    });
  },
});
