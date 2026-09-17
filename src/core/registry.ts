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
  /** Imports the adapter module; called once, on the first `create()` for the key. */
  readonly load: () => Promise<RegistryConstructor>;
}

interface Entry extends RegistryEntry {
  RegistryClass?: RegistryConstructor;
  pending?: Promise<RegistryConstructor>;
}

let entries: Map<string, Entry> | undefined;

/**
 * The registry table, seeded from the built-in manifest on first use.
 *
 * Seeding copies metadata only. Adapter modules stay unloaded until `create()` asks for one, so
 * listing ecosystems or checking a key never parses an adapter.
 *
 * @returns {Map<string, Entry>} The seeded table.
 */
function table(): Map<string, Entry> {
  entries ??= new Map(builtins.map((entry): [string, Entry] => [entry.ecosystem, { ...entry }]));
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
  table().set(ecosystem, {
    ecosystem,
    defaultURL,
    load: () => Promise.resolve(RegistryClass),
    RegistryClass,
  });
}

/**
 * Create an adapter for a registered ecosystem.
 *
 * The first call for a built-in ecosystem imports its adapter module; later calls reuse the
 * loaded class. The pending import is shared, so parallel cold calls trigger one load, and a
 * rejected import is cleared so the next call retries instead of replaying the failure.
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
  if (!entry.RegistryClass) {
    entry.pending ??= entry.load();
    try {
      entry.RegistryClass = await entry.pending;
    } catch (error) {
      entry.pending = undefined;
      throw error;
    }
  }
  return new entry.RegistryClass(baseURL || entry.defaultURL, client ?? defaultClient());
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
