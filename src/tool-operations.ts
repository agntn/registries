import type { Client } from "./core/client.ts";
import { InvalidPURLError, PkioError } from "./core/errors.ts";
import { parsePURL } from "./core/purl.ts";
import { ecosystems } from "./core/registry.ts";
import type { Package, Version } from "./core/types.ts";
import {
  bulkFetchPackages,
  fetchDependenciesFromPURL,
  fetchMaintainersFromPURL,
  fetchPackageFromPURL,
  fetchVersionsFromPURL,
  selectRecentVersions,
} from "./helpers.ts";

export const MAX_PURL_LENGTH = 2_048;
export const MAX_BULK_PACKAGES = 50;
export const DEFAULT_BULK_CONCURRENCY = 15;
export const MAX_BULK_CONCURRENCY = 50;
export const DEFAULT_VERSIONS_LIMIT = 20;

export interface ToolResult<T> {
  content: Array<{ type: "text"; text: string }>;
  details: T;
  isError?: boolean;
}

export interface PURLParams {
  readonly purl: string;
}

export interface VersionsParams extends PURLParams {
  readonly limit?: number | "all";
}

/** What an agent gets back from a version lookup: the newest releases and a count of the rest. */
export interface RecentVersions {
  readonly order: "newest first";
  readonly total: number;
  readonly omitted: number;
  readonly versions: Version[];
}

export interface BulkPackagesParams {
  readonly purls: readonly string[];
  readonly concurrency?: number;
}

function jsonResult<T>(details: T): ToolResult<T> {
  return {
    content: [{ type: "text", text: JSON.stringify(details) }],
    details,
  };
}

function assertPURL(purl: string): void {
  if (typeof purl !== "string" || purl.length === 0) {
    throw new InvalidPURLError(String(purl), "must be a non-empty string");
  }
  if (purl.length > MAX_PURL_LENGTH) {
    throw new InvalidPURLError(
      purl.slice(0, MAX_PURL_LENGTH),
      `must not exceed ${MAX_PURL_LENGTH} characters`,
    );
  }

  const parsed = parsePURL(purl);
  if (Object.hasOwn(parsed.qualifiers, "repository_url")) {
    throw new InvalidPURLError(purl, "repository_url is not allowed in agent tools");
  }
}

function isPURLArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === "string");
}

function assertBulkParams(params: Readonly<BulkPackagesParams>): void {
  if (!isPURLArray(params.purls) || params.purls.length === 0) {
    throw new PkioError("Bulk package lookup needs at least one PURL");
  }
  if (params.purls.length > MAX_BULK_PACKAGES) {
    throw new PkioError(`Bulk package lookup accepts at most ${MAX_BULK_PACKAGES} PURLs`);
  }
  for (const purl of params.purls) assertPURL(purl);

  const concurrency = params.concurrency ?? DEFAULT_BULK_CONCURRENCY;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > MAX_BULK_CONCURRENCY) {
    throw new PkioError(`Concurrency must be an integer from 1 through ${MAX_BULK_CONCURRENCY}`);
  }
}

export async function packageOperation(
  params: Readonly<PURLParams>,
  signal?: AbortSignal,
  client?: Client,
): Promise<ToolResult<Package>> {
  assertPURL(params.purl);
  return jsonResult(await fetchPackageFromPURL(params.purl, signal, client));
}

function versionsLimit(limit: unknown): number {
  if (limit === undefined) return DEFAULT_VERSIONS_LIMIT;
  if (limit === "all") return Number.POSITIVE_INFINITY;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1) {
    throw new PkioError('Version limit must be a positive integer or "all"');
  }
  return limit;
}

/**
 * The newest releases of one package, cut to the limit an agent asked for.
 *
 * @param purl - Package URL.
 * @param limit - How many versions to return, `"all"` for the whole history; 20 when absent.
 * @param signal - Optional cancellation signal.
 * @param client - Optional HTTP client.
 * @returns {Promise<RecentVersions>} The versions shown and how many were left out.
 */
export async function fetchRecentVersions(
  purl: string,
  limit?: number | "all",
  signal?: AbortSignal,
  client?: Client,
): Promise<RecentVersions> {
  const max = versionsLimit(limit);
  const all = await fetchVersionsFromPURL(purl, signal, client);
  const versions = selectRecentVersions(all, max);
  return {
    order: "newest first",
    total: all.length,
    omitted: all.length - versions.length,
    versions,
  };
}

export async function versionsOperation(
  params: Readonly<VersionsParams>,
  signal?: AbortSignal,
  client?: Client,
): Promise<ToolResult<RecentVersions>> {
  assertPURL(params.purl);
  return jsonResult(await fetchRecentVersions(params.purl, params.limit, signal, client));
}

export async function dependenciesOperation(
  params: Readonly<PURLParams>,
  signal?: AbortSignal,
  client?: Client,
) {
  assertPURL(params.purl);
  return jsonResult(await fetchDependenciesFromPURL(params.purl, signal, client));
}

export async function maintainersOperation(
  params: Readonly<PURLParams>,
  signal?: AbortSignal,
  client?: Client,
) {
  assertPURL(params.purl);
  return jsonResult(await fetchMaintainersFromPURL(params.purl, signal, client));
}

export async function bulkPackagesOperation(
  params: Readonly<BulkPackagesParams>,
  signal?: AbortSignal,
  client?: Client,
): Promise<ToolResult<Record<string, Package>>> {
  assertBulkParams(params);
  const packages = await bulkFetchPackages(params.purls, {
    concurrency: params.concurrency ?? DEFAULT_BULK_CONCURRENCY,
    signal,
    client,
  });
  return jsonResult(Object.fromEntries(packages));
}

export async function ecosystemsOperation(): Promise<ToolResult<{ ecosystems: string[] }>> {
  return jsonResult({ ecosystems: ecosystems().sort() });
}
