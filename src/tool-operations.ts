import "./registries/index.ts";
import type { Client } from "./core/client.ts";
import { InvalidPURLError, PkioError } from "./core/errors.ts";
import { parsePURL } from "./core/purl.ts";
import { ecosystems } from "./core/registry.ts";
import type { Package } from "./core/types.ts";
import {
  bulkFetchPackages,
  fetchDependenciesFromPURL,
  fetchMaintainersFromPURL,
  fetchPackageFromPURL,
  fetchVersionsFromPURL,
} from "./helpers.ts";

export const MAX_PURL_LENGTH = 2_048;
export const MAX_BULK_PACKAGES = 50;
export const DEFAULT_BULK_CONCURRENCY = 15;
export const MAX_BULK_CONCURRENCY = 50;

export interface ToolResult<T> {
  content: Array<{ type: "text"; text: string }>;
  details: T;
  isError?: boolean;
}

export interface PURLParams {
  readonly purl: string;
}

export interface BulkPackagesParams {
  readonly purls: readonly string[];
  readonly concurrency?: number;
}

function jsonResult<T>(details: T): ToolResult<T> {
  return {
    content: [{ type: "text", text: JSON.stringify(details, null, 2) }],
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

export async function versionsOperation(
  params: Readonly<PURLParams>,
  signal?: AbortSignal,
  client?: Client,
) {
  assertPURL(params.purl);
  return jsonResult(await fetchVersionsFromPURL(params.purl, signal, client));
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
