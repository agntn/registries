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
 * Snapshots `directory` and tells later whether it changed, a tree gone mid-scan included.
 * @param directory - The source tree the server loads from.
 * @returns {() => boolean} Whether the tree changed since the snapshot.
 */
export function sourceChangeCheck(directory: string): () => boolean {
  const loaded = lastSourceChange(directory);
  return () => {
    try {
      return lastSourceChange(directory) !== loaded;
    } catch {
      return true;
    }
  };
}
