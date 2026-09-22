import consola from "consola";
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

export const sharedArgs = {
  json: {
    type: "boolean" as const,
    description: "Output as JSON",
    default: false,
  },
  cache: {
    type: "boolean" as const,
    description: "Read and write cached results",
    negativeDescription: "Bypass cache reads and writes, fetch fresh data",
    default: true,
  },
} as const;

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
  const purl = input.startsWith("pkg:") ? input : `pkg:${input}`;
  const [reg, name, version] = await createFromPURL(purl);
  return [useCache ? new CachedRegistry(reg) : reg, name, version];
}

/**
 * Run a command with standard CLI error handling.
 *
 * @param fn - Command operation to run.
 * @returns {Promise<void>} Completion after the command or handled exit.
 */
export async function withErrorHandling(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof NotFoundError) {
      consola.error(
        `Package not found: ${error.ecosystem}/${error.packageName}${error.version ? `@${error.version}` : ""}`,
      );
      return process.exit(1);
    }
    if (error instanceof UnknownEcosystemError) {
      consola.error(`Unknown ecosystem: ${error.ecosystem}`);
      consola.info(`Supported: ${ecosystems().join(", ")}`);
      return process.exit(1);
    }
    if (error instanceof InvalidPURLError) {
      consola.error(`Invalid PURL: ${error.purl}`);
      consola.info("Examples: pkg:npm/lodash, npm/lodash@4.17.21, pkg:cargo/serde");
      return process.exit(1);
    }
    if (error instanceof RateLimitError) {
      consola.error(`Rate limited by registry. Retry after ${error.retryAfter}s`);
      return process.exit(1);
    }
    if (error instanceof HTTPError) {
      consola.error(`Registry request failed: HTTP ${error.statusCode} (${error.url})`);
      if (error.isServerError()) {
        consola.info("The registry may be temporarily unavailable. Try again later.");
      }
      return process.exit(1);
    }
    throw error;
  }
}
