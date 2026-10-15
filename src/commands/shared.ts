import { sanitizeLine, type ToolResult } from "@agntn/tools";
import { createFromPURL } from "../core/purl.ts";
import { ecosystems, type Registry } from "../core/registry.ts";
import {
  HTTPError,
  NotFoundError,
  RateLimitError,
  UnknownEcosystemError,
  InvalidPURLError,
} from "../core/errors.ts";
import { CachedRegistry } from "../cache/cached-registry.ts";

/** What every lookup command takes: the package and whether the cache may answer. */
export interface LookupArgs {
  readonly purl: string;
  readonly cache?: boolean;
}

/**
 * The command line takes `npm/lodash` for `pkg:npm/lodash`.
 *
 * @param input - PURL or shorthand package identifier.
 * @returns {string} The PURL with its scheme.
 */
export function withScheme(input: string): string {
  return input.startsWith("pkg:") ? input : `pkg:${input}`;
}

/**
 * Resolve a PURL or shorthand, using cache unless disabled.
 *
 * @param input - PURL or shorthand package identifier.
 * @param useCache - Whether to wrap the registry with caching.
 * @returns {Promise<[Registry, string, string]>} The registry, package name, and version.
 */
export async function resolvePURL(
  input: string,
  useCache = true,
): Promise<[Registry, string, string]> {
  const [reg, name, version] = await createFromPURL(withScheme(input));
  return [useCache ? new CachedRegistry(reg) : reg, name, version];
}

/**
 * The lines a command prints, with the details `--json` prints instead.
 *
 * @param lines - Human text, one entry per line.
 * @param details - What `--json` prints.
 * @returns {ToolResult<T>} One text block over the details.
 */
export function linesResult<T>(lines: readonly string[], details: T): ToolResult<T> {
  return { content: [{ type: "text", text: lines.join("\n") }], details };
}

/**
 * Why a lookup failed, with a hint where one helps. A failure the library didn't type is a bug
 * and keeps its stack.
 *
 * @param error - What the lookup threw.
 * @returns {readonly string[]} The lines for stderr, each one line whatever the input echoed.
 */
export function failureLines(error: unknown): readonly string[] {
  return typedFailureLines(error).map(sanitizeLine);
}

/**
 * @param error - What the lookup threw.
 * @returns {readonly string[]} The lines with the PURL and the URL as they came.
 */
function typedFailureLines(error: unknown): readonly string[] {
  if (error instanceof NotFoundError) {
    return [
      `Package not found: ${error.ecosystem}/${error.packageName}${error.version ? `@${error.version}` : ""}`,
    ];
  }
  if (error instanceof UnknownEcosystemError) {
    return [`Unknown ecosystem: ${error.ecosystem}`, `Supported: ${ecosystems().join(", ")}`];
  }
  if (error instanceof InvalidPURLError) {
    return [
      `Invalid PURL: ${error.purl}`,
      "Examples: pkg:npm/lodash, npm/lodash@4.17.21, pkg:cargo/serde",
    ];
  }
  if (error instanceof RateLimitError) {
    return [`Rate limited by registry. Retry after ${error.retryAfter}s`];
  }
  if (error instanceof HTTPError) return httpFailureLines(error);
  throw error;
}

/**
 * @param error - A registry answer that wasn't a success.
 * @returns {readonly string[]} The status and URL, plus a nudge to wait when the registry broke.
 */
function httpFailureLines(error: Pick<HTTPError, "statusCode" | "url" | "isServerError">) {
  const lines = [`Registry request failed: HTTP ${error.statusCode} (${error.url})`];
  if (error.isServerError()) {
    lines.push("The registry may be temporarily unavailable. Try again later.");
  }
  return lines;
}

/**
 * Runs one lookup and turns a typed library failure into an error answer: stderr, exit code 1.
 *
 * @param lookup - The command's own work.
 * @returns {Promise<ToolResult<T | undefined>>} The answer, or the failure lines.
 */
export async function answer<T>(
  lookup: () => Promise<ToolResult<T>>,
): Promise<ToolResult<T | undefined>> {
  try {
    return await lookup();
  } catch (error) {
    return { ...linesResult(failureLines(error), undefined), isError: true };
  }
}
