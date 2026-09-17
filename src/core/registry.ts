import type { Client } from "./client.ts";
import { defaultClient } from "./client.ts";
import { UnknownEcosystemError } from "./errors.ts";
import { builtins } from "../registries/index.ts";
import type { Dependency, Maintainer, Package, URLBuilder, Version } from "./types.ts";

/** Common base for package registries and registry decorators. */
export abstract class Registry {
  abstract ecosystem(): string;
  abstract fetchPackage(name: string, signal?: AbortSignal): Promise<Package>;
  abstract fetchVersions(name: string, signal?: AbortSignal): Promise<Version[]>;
  abstract fetchDependencies(
    name: string,
    version: string,
    signal?: AbortSignal,
  ): Promise<Dependency[]>;
  abstract fetchMaintainers(name: string, signal?: AbortSignal): Promise<Maintainer[]>;
  abstract urls(): URLBuilder;
}

/** Constructor every adapter exposes, built-in or registered from outside the package. */
export type RegistryConstructor = new (baseURL: string, client: Client) => Registry;

/** One ecosystem the registry knows: static metadata plus a loader for the adapter class. */
export interface RegistryEntry {
  /** PURL type the adapter serves. */
  readonly ecosystem: string;
  /** Registry API URL used when `create()` gets none. */
  readonly defaultURL: string;
  /** Resolves the adapter class; for a built-in that is a literal `import()` of its module. */
  readonly load: () => Promise<RegistryConstructor>;
}

let entries: Map<string, RegistryEntry> | undefined;

/**
 * The registry table, seeded from the built-in manifest on first use.
 *
 * Seeding on first use rather than at module scope keeps this module free of calls a bundler
 * would have to keep, so a consumer that never resolves an ecosystem drops the table too.
 *
 * @returns {Map<string, RegistryEntry>} The seeded table.
 */
function table(): Map<string, RegistryEntry> {
  entries ??= new Map(builtins.map((entry): [string, RegistryEntry] => [entry.ecosystem, entry]));
  return entries;
}

/**
 * Register an ecosystem adapter.
 *
 * Built-in adapters are already listed; this is the entry point for classes living outside the
 * package. Registering a key again replaces the previous adapter.
 *
 * @param ecosystem - Ecosystem key.
 * @param defaultURL - Default registry API URL.
 * @param RegistryClass - Adapter constructor.
 */
export function register(
  ecosystem: string,
  defaultURL: string,
  RegistryClass: RegistryConstructor,
): void {
  table().set(ecosystem, { ecosystem, defaultURL, load: () => Promise.resolve(RegistryClass) });
}

/**
 * Create an adapter for a registered ecosystem.
 *
 * A built-in adapter's module is imported here, on the first call for its key; the module map
 * shares one import between parallel callers and answers later calls from cache.
 *
 * @param ecosystem - Ecosystem key.
 * @param baseURL - Optional registry API URL override.
 * @param client - Optional HTTP client.
 * @returns {Promise<Registry>} The registry adapter.
 * @throws {UnknownEcosystemError} When nothing is registered under `ecosystem`.
 */
export async function create(
  ecosystem: string,
  baseURL?: string,
  client?: Client,
): Promise<Registry> {
  const entry = table().get(ecosystem);
  if (!entry) {
    throw new UnknownEcosystemError(ecosystem);
  }
  const RegistryClass = await entry.load();
  return new RegistryClass(baseURL || entry.defaultURL, client ?? defaultClient());
}

/**
 * List registered ecosystems.
 *
 * @returns {string[]} The ecosystem keys, built-ins first in manifest order.
 */
export function ecosystems(): string[] {
  return [...table().keys()];
}

/**
 * Check whether an ecosystem is registered.
 *
 * @param ecosystem - Ecosystem key.
 * @returns {boolean} Whether an adapter is registered.
 */
export function has(ecosystem: string): boolean {
  return table().has(ecosystem);
}
