import type { Package, Version, Dependency, Maintainer, URLBuilder } from "./core/types.ts";
import type { Client } from "./core/client.ts";
import { createFromPURL } from "./core/purl.ts";
import { InvalidPURLError } from "./core/errors.ts";

/**
 * Fetch normalized package metadata from a package URL.
 *
 * @param purl - Package URL.
 * @param signal - Optional cancellation signal.
 * @param client - Optional HTTP client.
 * @returns {Promise<Package>} Normalized package metadata.
 */
export async function fetchPackageFromPURL(
  purl: string,
  signal?: AbortSignal,
  client?: Client,
): Promise<Package> {
  const [reg, name] = await createFromPURL(purl, client);
  return reg.fetchPackage(name, signal);
}

/**
 * Fetch all versions from a package URL.
 *
 * @param purl - Package URL.
 * @param signal - Optional cancellation signal.
 * @param client - Optional HTTP client.
 * @returns {Promise<Version[]>} Normalized versions.
 */
export async function fetchVersionsFromPURL(
  purl: string,
  signal?: AbortSignal,
  client?: Client,
): Promise<Version[]> {
  const [reg, name] = await createFromPURL(purl, client);
  return reg.fetchVersions(name, signal);
}

/**
 * Newest releases first, undated ones last, cut to `limit`.
 *
 * @param versions - Versions in any order; the array is left as it was.
 * @param limit - How many to keep, `Infinity` for every one.
 * @returns {Version[]} A sorted copy of at most `limit` versions.
 */
export function selectRecentVersions(versions: readonly Version[], limit: number): Version[] {
  return versions
    .toSorted((a, b) => {
      if (a.publishedAt === null) return b.publishedAt === null ? 0 : 1;
      if (b.publishedAt === null) return -1;
      return b.publishedAt.getTime() - a.publishedAt.getTime();
    })
    .slice(0, limit);
}

/**
 * Fetch dependencies for a versioned package URL.
 *
 * @param purl - Versioned package URL.
 * @param signal - Optional cancellation signal.
 * @param client - Optional HTTP client.
 * @returns {Promise<Dependency[]>} Normalized dependencies.
 */
export async function fetchDependenciesFromPURL(
  purl: string,
  signal?: AbortSignal,
  client?: Client,
): Promise<Dependency[]> {
  const [reg, name, version] = await createFromPURL(purl, client);
  if (!version) {
    throw new InvalidPURLError(purl, "must include a version for dependency lookup");
  }
  return reg.fetchDependencies(name, version, signal);
}

/**
 * Fetch maintainers from a package URL.
 *
 * @param purl - Package URL.
 * @param signal - Optional cancellation signal.
 * @param client - Optional HTTP client.
 * @returns {Promise<Maintainer[]>} Normalized maintainers.
 */
export async function fetchMaintainersFromPURL(
  purl: string,
  signal?: AbortSignal,
  client?: Client,
): Promise<Maintainer[]> {
  const [reg, name] = await createFromPURL(purl, client);
  return reg.fetchMaintainers(name, signal);
}

const DEFAULT_CONCURRENCY = 15;

/**
 * Fetch packages concurrently, skipping failed lookups.
 *
 * @param purls - Package URLs to fetch.
 * @param options - Optional concurrency, cancellation, and client settings.
 * @returns {Promise<Map<string, Package>>} Results keyed by package URL.
 */
export async function bulkFetchPackages(
  purls: readonly string[],
  options?: Readonly<{ concurrency?: number; signal?: AbortSignal; client?: Client }>,
): Promise<Map<string, Package>> {
  const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY;
  const results = new Map<string, Package>();
  const queue = [...purls];

  const signal = options?.signal;

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      if (signal?.aborted) break;

      const purl = queue.shift()!;
      try {
        const pkg = await fetchPackageFromPURL(purl, signal, options?.client);
        results.set(purl, pkg);
      } catch {
        if (signal?.aborted) break;
        // Silently skip failed lookups — absent from results map
      }
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * Select an exact requested or latest version, then the newest usable one.
 *
 * @param versions - Candidate versions.
 * @param options - Optional requested and latest version numbers.
 * @returns {Version | null} The selected version, or null.
 */
export function selectVersion(
  versions: readonly Version[],
  options?: Readonly<{
    requested?: string;
    latest?: string;
  }>,
): Version | null {
  const { requested, latest } = options ?? {};

  if (requested) {
    const exact = versions.find((v) => v.number === requested && v.status === "");
    if (exact) return exact;
  }

  if (latest) {
    const latestV = versions.find((v) => v.number === latest && v.status === "");
    if (latestV) return latestV;
  }

  const usable = versions.filter((v) => v.status === "");
  if (usable.length === 0) return null;

  usable.sort((a, b) => {
    const at = a.publishedAt?.getTime() ?? 0;
    const bt = b.publishedAt?.getTime() ?? 0;
    return bt - at;
  });

  return usable[0] ?? null;
}

/**
 * Resolve the best documentation URL for a package.
 *
 * @param pkg - Package metadata.
 * @param urls - Ecosystem URL builder.
 * @param version - Optional package version.
 * @returns {string} The explicit, homepage, or ecosystem documentation URL.
 */
export function resolveDocsUrl(pkg: Package, urls: URLBuilder, version?: string): string {
  return pkg.documentation || pkg.homepage || urls.documentation(pkg.name, version);
}

/**
 * Resolve the ecosystem README URL for a package.
 *
 * @param pkg - Package metadata.
 * @param urls - Ecosystem URL builder.
 * @param version - Optional package version.
 * @returns {string} The README URL.
 */
export function resolveReadmeUrl(pkg: Package, urls: URLBuilder, version?: string): string {
  return urls.readme(pkg.name, version);
}
