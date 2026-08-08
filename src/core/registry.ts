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

/** Register an ecosystem class. Called by each registry module on import. */
export function register(
  ecosystem: string,
  defaultURL: string,
  RegistryClass: new (baseURL: string, client: Client) => Registry,
): void {
  constructors.set(ecosystem, RegistryClass);
  defaults.set(ecosystem, defaultURL);
}

/** Create a registry instance for the given ecosystem. */
export function create(ecosystem: string, baseURL?: string, client?: Client): Registry {
  const RegistryClass = constructors.get(ecosystem);
  if (!RegistryClass) {
    throw new UnknownEcosystemError(ecosystem);
  }
  return new RegistryClass(baseURL || defaults.get(ecosystem)!, client ?? defaultClient());
}

/** List all registered ecosystem names. */
export function ecosystems(): string[] {
  return [...constructors.keys()];
}

/** Check if an ecosystem is registered. */
export function has(ecosystem: string): boolean {
  return constructors.has(ecosystem);
}
