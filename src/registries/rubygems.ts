import type { Client } from "../core/client.ts";
import type { Dependency, Maintainer, Package, URLBuilder, Version } from "../core/types.ts";
import { Registry, register } from "../core/registry.ts";
import { combineLicenses, normalizeLicense } from "../core/license.ts";
import { normalizeRepositoryURL } from "../core/repository.ts";
import { buildPURL } from "../core/purl.ts";
import { rethrowFetchError } from "./error.ts";

/** RubyGems API response for a single gem. */
interface RubyGemsGemResponse {
  name: string;
  version?: string;
  description: string;
  homepage_uri?: string;
  documentation_uri?: string;
  source_code_uri?: string;
  licenses?: string[];
  metadata?: Record<string, unknown>;
  dependencies?: {
    runtime?: Array<{
      name: string;
      requirements: string;
    }>;
    development?: Array<{
      name: string;
      requirements: string;
    }>;
  };
}

/** RubyGems version data. */
interface RubyGemsVersionResponse {
  number: string;
  sha: string;
  created_at?: string;
  yanked?: boolean;
}

/** RubyGems owner data. */
interface RubyGemsOwnerResponse {
  handle: string;
  email?: string;
}

function orEmpty(value: string | undefined): string {
  return value || "";
}

function gemLicenses(licenses: readonly string[] | undefined): string {
  return licenses ? combineLicenses(licenses.map((license) => normalizeLicense(license))) : "";
}

function gemRepositoryURL(
  sourceCodeURI: string | undefined,
  metadata: Readonly<Record<string, unknown>> | undefined,
  homepageURI: string | undefined,
): string {
  const metadataURI = metadata?.["source_code_uri"];
  if (sourceCodeURI) return normalizeRepositoryURL(sourceCodeURI);
  if (metadataURI) return normalizeRepositoryURL(metadataURI);
  return normalizeRepositoryURL(homepageURI ?? "");
}

/** RubyGems registry client. */
export class RubyGemsRegistry extends Registry {
  constructor(baseURL: string, client: Client) {
    super();
    this.baseURL = baseURL;
    this.client = client;
  }

  readonly baseURL: string;
  readonly client: Client;

  ecosystem(): string {
    return "gem";
  }

  async fetchPackage(name: string, signal?: AbortSignal): Promise<Package> {
    const url = `${this.baseURL}/api/v1/gems/${name}.json`;

    try {
      const data = await this.client.getJSON<RubyGemsGemResponse>(url, signal);

      const licenses = gemLicenses(data.licenses);
      const repository = gemRepositoryURL(data.source_code_uri, data.metadata, data.homepage_uri);

      return {
        name: data.name,
        description: orEmpty(data.description),
        homepage: orEmpty(data.homepage_uri),
        documentation: orEmpty(data.documentation_uri),
        repository,
        licenses,
        keywords: [],
        namespace: "",
        latestVersion: orEmpty(data.version),
        metadata: data.metadata ?? {},
      };
    } catch (error) {
      rethrowFetchError(error, this.ecosystem(), name);
    }
  }

  async fetchVersions(name: string, signal?: AbortSignal): Promise<Version[]> {
    const url = `${this.baseURL}/api/v1/versions/${name}.json`;

    try {
      const data = await this.client.getJSON<RubyGemsVersionResponse[]>(url, signal);
      const versions: Version[] = [];

      for (const versionData of data) {
        const publishedAt = versionData.created_at ? new Date(versionData.created_at) : null;
        const status = versionData.yanked ? "yanked" : "";

        versions.push({
          number: versionData.number,
          publishedAt,
          licenses: "",
          integrity: versionData.sha ? `sha256-${versionData.sha}` : "",
          status,
          metadata: {},
        });
      }

      return versions;
    } catch (error) {
      rethrowFetchError(error, this.ecosystem(), name);
    }
  }

  async fetchDependencies(
    name: string,
    version: string,
    signal?: AbortSignal,
  ): Promise<Dependency[]> {
    const url = `${this.baseURL}/api/v2/rubygems/${name}/versions/${version}.json`;

    try {
      const data = await this.client.getJSON<RubyGemsGemResponse>(url, signal);
      const dependencies: Dependency[] = [];

      // Runtime dependencies
      if (data.dependencies?.runtime) {
        for (const dep of data.dependencies.runtime) {
          dependencies.push({
            name: dep.name,
            requirements: dep.requirements,
            scope: "runtime",
            optional: false,
          });
        }
      }

      // Development dependencies
      if (data.dependencies?.development) {
        for (const dep of data.dependencies.development) {
          dependencies.push({
            name: dep.name,
            requirements: dep.requirements,
            scope: "development",
            optional: false,
          });
        }
      }

      return dependencies;
    } catch (error) {
      rethrowFetchError(error, this.ecosystem(), name, version);
    }
  }

  async fetchMaintainers(name: string, signal?: AbortSignal): Promise<Maintainer[]> {
    const url = `${this.baseURL}/api/v1/gems/${name}/owners.json`;

    try {
      const data = await this.client.getJSON<RubyGemsOwnerResponse[]>(url, signal);
      const maintainers: Maintainer[] = [];

      for (const owner of data) {
        maintainers.push({
          uuid: "",
          login: owner.handle,
          name: owner.handle,
          email: owner.email || "",
          url: "",
          role: "",
        });
      }

      return maintainers;
    } catch (error) {
      rethrowFetchError(error, this.ecosystem(), name);
    }
  }

  urls(): URLBuilder {
    return {
      registry: (name: string, version?: string) => {
        const base = `https://rubygems.org/gems/${name}`;
        return version ? `${base}/versions/${version}` : base;
      },
      download: (name: string, version: string) => {
        return `https://rubygems.org/downloads/${name}-${version}.gem`;
      },
      documentation: (name: string, version?: string) => {
        const versionSuffix = version ? `/${version}` : "";
        return `https://www.rubydoc.info/gems/${name}${versionSuffix}`;
      },
      readme: (name: string, version?: string) => {
        const base = `https://rubygems.org/gems/${name}`;
        return version ? `${base}/versions/${version}` : base;
      },
      purl: (name: string, version?: string) => {
        return buildPURL({ type: "gem", name, version });
      },
    };
  }
}

register("gem", "https://rubygems.org", RubyGemsRegistry);
