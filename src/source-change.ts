import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Newest ctime under `directory`. ctime can't be backdated, and a removal touches the parent's.
 * @param directory - Root of the tree.
 * @returns {number} The newest ctime in milliseconds.
 */
export function lastSourceChange(directory: string): number {
  let newest = statSync(directory).ctimeMs;
  for (const entry of readdirSync(directory, { encoding: "utf8", recursive: true })) {
    const stats = statSync(join(directory, entry), { throwIfNoEntry: false });
    if (stats && stats.ctimeMs > newest) newest = stats.ctimeMs;
  }
  return newest;
}

/**
 * Tells whether anything under `directory` changed after `since`, a tree gone mid-scan included.
 * @param directory - The source tree the server loads from.
 * @param since - Epoch milliseconds from before the first module of that tree loaded.
 * @returns {() => boolean} Whether the tree changed since then.
 */
export function sourceChangeCheck(directory: string, since: number): () => boolean {
  return () => {
    try {
      return lastSourceChange(directory) > since;
    } catch {
      return true;
    }
  };
}
