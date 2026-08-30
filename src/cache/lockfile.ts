import type { Storage } from "unstorage";
import { getStorage } from "./storage.ts";

const LOCKFILE_VERSION = 1;
const LOCKFILE_KEY = "__lockfile__";

/** Default TTL per data type (seconds). */
export const DEFAULT_TTL = {
  package: 3600, // 1 hour — package metadata changes rarely
  versions: 1800, // 30 min — new versions published more often
  dependencies: 86400, // 24 hours — deps of a specific version never change
  maintainers: 86400, // 24 hours
} as const;

export type EntryType = keyof typeof DEFAULT_TTL;

/** A single cached entry tracked in the lockfile. */
export interface LockfileEntry {
  /** PURL-style key: 'npm:lodash', 'cargo:serde' */
  key: string;
  /** What kind of data: package, versions, dependencies, maintainers */
  type: EntryType;
  /** Unix timestamp (ms) when fetched */
  fetchedAt: number;
  /** TTL in seconds */
  ttl: number;
  /** Latest version at time of caching (for package entries) */
  latestVersion?: string;
  /** Content hash (sha256 of JSON-serialized value) for integrity */
  integrity: string;
}

/** The full lockfile structure. */
export interface Lockfile {
  version: number;
  entries: Record<string, LockfileEntry>;
}

function emptyLockfile(): Lockfile {
  return { version: LOCKFILE_VERSION, entries: {} };
}

/**
 * Read the lockfile, falling back to an empty valid structure.
 *
 * @param storage - Optional storage backend.
 * @returns {Promise<Lockfile>} The stored or empty lockfile.
 */
export async function readLockfile(storage?: Storage): Promise<Lockfile> {
  const s = storage ?? getStorage();
  try {
    const data = await s.getItem<Lockfile>(LOCKFILE_KEY);
    if (!data || data.version !== LOCKFILE_VERSION) return emptyLockfile();
    return data;
  } catch {
    return emptyLockfile();
  }
}

/**
 * Persist the lockfile.
 *
 * @param lockfile - Lockfile to persist.
 * @param storage - Optional storage backend.
 */
export async function writeLockfile(lockfile: Lockfile, storage?: Storage): Promise<void> {
  const s = storage ?? getStorage();
  await s.setItem(LOCKFILE_KEY, lockfile);
}

/**
 * Build a stable cache key.
 *
 * @param ecosystem - Registry ecosystem.
 * @param name - Package name.
 * @param type - Cached data type.
 * @param version - Optional package version.
 * @returns {string} The cache key.
 */
export function cacheKey(
  ecosystem: string,
  name: string,
  type: EntryType,
  version?: string,
): string {
  const base = `${ecosystem}:${name}:${type}`;
  return version ? `${base}:${version}` : base;
}

/**
 * Check whether a lockfile entry is fresh.
 *
 * @param entry - Entry to inspect.
 * @returns {boolean} Whether the entry is still valid.
 */
export function isFresh(entry: LockfileEntry): boolean {
  const expiresAt = entry.fetchedAt + entry.ttl * 1000;
  return Date.now() < expiresAt;
}

/**
 * Read a fresh lockfile entry.
 *
 * @param lockfile - Lockfile to inspect.
 * @param key - Cache key.
 * @returns {LockfileEntry | null} The fresh entry, or null.
 */
export function getFreshEntry(lockfile: Lockfile, key: string): LockfileEntry | null {
  const entry = lockfile.entries[key];
  if (!entry) return null;
  if (!isFresh(entry)) return null;
  return entry;
}

/**
 * Upsert an in-memory lockfile entry without persisting it.
 *
 * @param lockfile - Lockfile to mutate.
 * @param entry - Entry to store.
 */
export function setEntry(lockfile: Lockfile, entry: LockfileEntry): void {
  lockfile.entries[entry.key] = entry;
}

/**
 * Remove an in-memory lockfile entry.
 *
 * @param lockfile - Lockfile to mutate.
 * @param key - Cache key to remove.
 */
export function removeEntry(lockfile: Lockfile, key: string): void {
  delete lockfile.entries[key];
}

/**
 * Remove every stale in-memory entry.
 *
 * @param lockfile - Lockfile to prune.
 * @returns {number} The number of removed entries.
 */
export function pruneStale(lockfile: Lockfile): number {
  let removed = 0;
  for (const key of Object.keys(lockfile.entries)) {
    if (!isFresh(lockfile.entries[key]!)) {
      delete lockfile.entries[key];
      removed++;
    }
  }
  return removed;
}
