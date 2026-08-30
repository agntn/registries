import type { Client } from "./client.ts";
import { defaultClient } from "./client.ts";
import { UnknownEcosystemError } from "./errors.ts";
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

const constructors = new Map<string, new (baseURL: string, client: Client) => Registry>();
const defaults = new Map<string, string>();

/**
 * Register an ecosystem adapter.
 *
 * @param ecosystem - Ecosystem key.
 * @param defaultURL - Default registry API URL.
 * @param RegistryClass - Adapter constructor.
 */
export function register(
  ecosystem: string,
  defaultURL: string,
  RegistryClass: new (baseURL: string, client: Client) => Registry,
): void {
  constructors.set(ecosystem, RegistryClass);
  defaults.set(ecosystem, defaultURL);
}

/**
 * Create an adapter for a registered ecosystem.
 *
 * @param ecosystem - Ecosystem key.
 * @param baseURL - Optional registry API URL override.
 * @param client - Optional HTTP client.
 * @returns {Registry} The registry adapter.
 */
export function create(ecosystem: string, baseURL?: string, client?: Client): Registry {
  const RegistryClass = constructors.get(ecosystem);
  if (!RegistryClass) {
    throw new UnknownEcosystemError(ecosystem);
  }
  return new RegistryClass(baseURL || defaults.get(ecosystem)!, client ?? defaultClient());
}

/**
 * List registered ecosystems.
 *
 * @returns {string[]} The ecosystem keys.
 */
export function ecosystems(): string[] {
  return [...constructors.keys()];
}

/**
 * Check whether an ecosystem is registered.
 *
 * @param ecosystem - Ecosystem key.
 * @returns {boolean} Whether an adapter is registered.
 */
export function has(ecosystem: string): boolean {
  return constructors.has(ecosystem);
}
