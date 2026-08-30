import { createStorage, prefixStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import type { Storage } from "unstorage";
import { getCacheDir } from "./paths.ts";
import { hash } from "node:crypto";

let _storage: Storage | undefined;

/**
 * Configure the storage backend before the first cache operation.
 *
 * @param storage - Storage backend to use.
 */
export function configureStorage(storage: Storage): void {
  _storage = storage;
}

/**
 * Get or create the shared storage backend.
 *
 * @returns {Storage} The configured or filesystem-backed storage.
 */
export function getStorage(): Storage {
  _storage ??= createStorage({
    driver: fsDriver({ base: getCacheDir() }),
  });
  return _storage;
}

/**
 * Get storage scoped to one registry ecosystem.
 *
 * @param ecosystem - Registry ecosystem key.
 * @returns {Storage} Namespaced storage for the ecosystem.
 */
export function getEcosystemStorage(ecosystem: string): Storage {
  return prefixStorage(getStorage(), ecosystem);
}

/**
 * Compute a SHA-256 integrity value for JSON-serializable data.
 *
 * @param value - Value to hash.
 * @returns {string} The prefixed hexadecimal digest.
 */
export function computeIntegrity(value: unknown): string {
  return `sha256-${hash("sha256", JSON.stringify(value), "hex")}`;
}

/** Dispose the storage instance. Call on process exit. */
export async function disposeStorage(): Promise<void> {
  if (_storage) {
    await _storage.dispose();
    _storage = undefined;
  }
}

/** Clear all cached data. */
export async function clearStorage(): Promise<void> {
  await getStorage().clear();
}
