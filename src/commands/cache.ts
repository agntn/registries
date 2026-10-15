import type { ToolResult } from "@agntn/tools";
import { getCacheDir } from "../cache/paths.ts";
import { clearStorage } from "../cache/storage.ts";
import { readLockfile, writeLockfile, pruneStale } from "../cache/lockfile.ts";
import { linesResult } from "./shared.ts";

/** What `registries cache` can do to the cache. */
export type CacheAction = "clear" | "path" | "status" | "prune";

/** How full the cache is, by freshness and by ecosystem. */
export interface CacheStatus {
  readonly directory: string;
  readonly total: number;
  readonly fresh: number;
  readonly stale: number;
  readonly ecosystems: Record<string, number>;
}

async function status(): Promise<ToolResult<CacheStatus>> {
  const entries = Object.values((await readLockfile()).entries);
  const now = Date.now();
  const fresh = entries.filter((entry) => now < entry.fetchedAt + entry.ttl * 1000);
  const ecosystems: Record<string, number> = {};
  for (const entry of fresh) {
    const ecosystem = entry.key.split(":")[0] ?? "";
    ecosystems[ecosystem] = (ecosystems[ecosystem] ?? 0) + 1;
  }
  const details = {
    directory: getCacheDir(),
    total: entries.length,
    fresh: fresh.length,
    stale: entries.length - fresh.length,
    ecosystems,
  };
  return linesResult(
    [
      "Cache status",
      `Directory:  ${details.directory}`,
      `Entries:    ${details.total} total, ${details.fresh} fresh, ${details.stale} stale`,
      ...Object.entries(ecosystems).map(([name, count]) => `  ${name}: ${count} cached`),
    ],
    details,
  );
}

/**
 * `registries cache <action>`: clear it, find it, count it or drop what went stale.
 *
 * @param args - The action.
 * @returns {Promise<ToolResult<unknown>>} What happened, in a line or a short report.
 */
export async function cache(args: { readonly action: CacheAction }): Promise<ToolResult<unknown>> {
  switch (args.action) {
    case "clear":
      await clearStorage();
      await writeLockfile({ version: 1, entries: {} });
      return linesResult(["Cache cleared"], { cleared: true });
    case "path":
      return linesResult([getCacheDir()], { directory: getCacheDir() });
    case "status":
      return status();
    case "prune": {
      const lockfile = await readLockfile();
      const removed = pruneStale(lockfile);
      await writeLockfile(lockfile);
      return linesResult([`Pruned ${removed} stale entries`], { removed });
    }
  }
}
