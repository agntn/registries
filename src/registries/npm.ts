import type { Client } from "../core/client.ts";
import type { Dependency, Maintainer, Package, URLBuilder, Version } from "../core/types.ts";
import { Registry } from "../core/registry.ts";
import { normalizeLicense } from "../core/license.ts";
import { normalizeRepositoryURL } from "../core/repository.ts";
import { buildPURL } from "../core/purl.ts";
import { rethrowFetchError } from "../core/errors.ts";

interface NpmPerson {
  readonly name?: string;
  readonly email?: string;
  readonly url?: string;
}

/** npm registry API response for a single package. */
interface NpmPackageResponse {
  name: string;
  description?: string;
  homepage?: string;
  repository?:
    | {
        type?: string;
        url?: string;
      }
    | string;
  license?:
    | string
    | {
        type?: string;
      };
  keywords?: string[];
  "dist-tags": {
    latest: string;
  };
  versions: Record<string, NpmVersion>;
  maintainers?: readonly NpmPerson[];
  time?: Record<string, string>;
}

/** npm version data. */
interface NpmVersion {
  name: string;
  version: string;
  description?: string;
  license?:
    | string
    | {
        type?: string;
      };
  keywords?: string[];
  author?: NpmPerson;
  contributors?: readonly NpmPerson[];
  maintainers?: readonly NpmPerson[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  dist?: {
    integrity?: string;
    shasum?: string;
    tarball?: string;
  };
  deprecated?: boolean | string;
}

/** npm registry client. */
export class NpmRegistry extends Registry {
  constructor(baseURL: string, client: Client) {
    super();
    this.baseURL = baseURL;
    this.client = client;
  }

  readonly baseURL: string;
  readonly client: Client;

  ecosystem(): string {
    return "npm";
  }

  async fetchPackage(name: string, signal?: AbortSignal): Promise<Package> {
    const encodedName = this.encodeName(name);
    const url = `${this.baseURL}/${encodedName}`;

    try {
      const data = await this.client.getJSON<NpmPackageResponse>(url, signal);

      const latestVersion = data["dist-tags"].latest;
      const latestVersionData = data.versions[latestVersion];

      const licenses = data.license
        ? this.extractLicense(data.license)
        : this.extractLicense(latestVersionData?.license);
      const namespace = this.extractNamespace(name);

      return {
        name: data.name,
        description: data.description || "",
        homepage: data.homepage || "",
        documentation: "",
        repository: normalizeRepositoryURL(data.repository || ""),
        licenses,
        keywords: data.keywords ?? [],
        namespace,
        latestVersion,
        metadata: {},
      };
    } catch (error) {
      rethrowFetchError(error, this.ecosystem(), name);
    }
  }

  async fetchVersions(name: string, signal?: AbortSignal): Promise<Version[]> {
    const encodedName = this.encodeName(name);
    const url = `${this.baseURL}/${encodedName}`;

    try {
      const data = await this.client.getJSON<NpmPackageResponse>(url, signal);

      return Object.entries(data.versions).map(([versionStr, versionData]) => {
        const licenses = this.extractLicense(versionData.license);
        const publishedAt = data.time?.[versionStr] ? new Date(data.time[versionStr]) : null;
        const status = versionData.deprecated ? "deprecated" : "";
        const integrity = versionData.dist?.integrity
          ? versionData.dist.integrity
          : versionData.dist?.shasum
            ? `sha1-${versionData.dist.shasum}`
            : "";

        return {
          number: versionStr,
          publishedAt,
          licenses,
          integrity,
          status,
          metadata: {},
        };
      });
    } catch (error) {
      rethrowFetchError(error, this.ecosystem(), name);
    }
  }

  async fetchDependencies(
    name: string,
    version: string,
    signal?: AbortSignal,
  ): Promise<Dependency[]> {
    const encodedName = this.encodeName(name);
    const url = `${this.baseURL}/${encodedName}/${version}`;

    try {
      const versionData = await this.client.getJSON<NpmVersion>(url, signal);
      const optionalNames = Object.keys(versionData.optionalDependencies ?? {});

      return [
        ...this.mapDependencies(versionData.dependencies, "runtime", false, optionalNames),
        ...this.mapDependencies(versionData.devDependencies, "development", false),
        ...this.mapDependencies(versionData.optionalDependencies, "runtime", true),
        ...this.mapDependencies(versionData.peerDependencies, "runtime", false),
      ];
    } catch (error) {
      rethrowFetchError(error, this.ecosystem(), name, version);
    }
  }

  async fetchMaintainers(name: string, signal?: AbortSignal): Promise<Maintainer[]> {
    const encodedName = this.encodeName(name);
    const url = `${this.baseURL}/${encodedName}`;

    try {
      const data = await this.client.getJSON<NpmPackageResponse>(url, signal);
      const latestVersion = data.versions[data["dist-tags"].latest];

      return this.collectMaintainers(
        data.maintainers,
        latestVersion?.author,
        latestVersion?.contributors,
      );
    } catch (error) {
      rethrowFetchError(error, this.ecosystem(), name);
    }
  }

  urls(): URLBuilder {
    return {
      registry: (name: string, version?: string) => {
        const base = `https://www.npmjs.com/package/${name}`;
        return version ? `${base}/v/${version}` : base;
      },
      download: (name: string, version: string) => {
        const encodedName = this.encodeName(name);
        const tarballName = name.includes("/") ? name.split("/")[1] : name;
        return `https://registry.npmjs.org/${encodedName}/-/${tarballName}-${version}.tgz`;
      },
      documentation: (name: string, _version?: string) => {
        return `https://www.npmjs.com/package/${name}`;
      },
      readme: (name: string, version?: string) => {
        const ver = version ? `@${version}` : "";
        return `https://cdn.jsdelivr.net/npm/${name}${ver}/README.md`;
      },
      purl: (name: string, version?: string) => {
        const namespace = this.extractNamespace(name);
        const bareName = namespace ? name.slice(namespace.length + 1) : name;
        return buildPURL({ type: "npm", namespace, name: bareName, version });
      },
    };
  }

  private mapDependencies(
    entries: Readonly<Record<string, string>> | undefined,
    scope: Dependency["scope"],
    optional: boolean,
    excluded: readonly string[] = [],
  ): Dependency[] {
    const dependencies: Dependency[] = [];

    for (const [name, requirements] of Object.entries(entries ?? {})) {
      if (excluded.includes(name)) continue;
      dependencies.push({ name, requirements, scope, optional });
    }

    return dependencies;
  }

  private collectMaintainers(
    maintainers: readonly NpmPerson[] | undefined,
    author: Readonly<NpmPerson> | undefined,
    contributors: readonly NpmPerson[] | undefined,
  ): Maintainer[] {
    const candidates: Maintainer[] = [
      ...(maintainers ?? []).map((maintainer) => this.toAccount(maintainer)),
      ...(author ? [this.toPerson(author, "author")] : []),
      ...(contributors ?? []).map((contributor) => this.toPerson(contributor, "contributor")),
    ];
    const seen = new Set<string>();
    const result: Maintainer[] = [];

    for (const candidate of candidates) {
      const key = candidate.email || candidate.name;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(candidate);
    }

    return result;
  }

  /**
   * A `maintainers` entry is an npm account, and its `name` is the username.
   *
   * @param maintainer - One entry of the package document's `maintainers`.
   * @returns {Maintainer} The account, with the username as both `login` and `name`.
   */
  private toAccount(maintainer: Readonly<NpmPerson>): Maintainer {
    const login = maintainer.name || "";
    return {
      uuid: "",
      login,
      name: login,
      email: maintainer.email || "",
      url: maintainer.url || "",
      role: "",
    };
  }

  /**
   * `author` and `contributors` come from package.json, where nobody has an npm login.
   *
   * @param person - One person of the latest version's `author` or `contributors`.
   * @param role - The role that field stands for.
   * @returns {Maintainer} The person, with an empty `login`.
   */
  private toPerson(person: Readonly<NpmPerson>, role: string): Maintainer {
    return {
      uuid: "",
      login: "",
      name: person.name || "",
      email: person.email || "",
      url: person.url || "",
      role,
    };
  }

  private encodeName(name: string): string {
    if (name.startsWith("@")) {
      return name.replace("/", "%2F");
    }
    return name;
  }

  private extractNamespace(name: string): string {
    if (name.startsWith("@")) {
      const parts = name.split("/");
      return parts[0] || "";
    }
    return "";
  }

  private extractLicense(raw: string | Readonly<{ type?: string }> | undefined): string {
    if (!raw) return "";

    if (typeof raw === "string") {
      return normalizeLicense(raw);
    }

    if (typeof raw === "object" && raw !== null) {
      const obj = raw as Record<string, unknown>;
      if (typeof obj["type"] === "string") {
        return normalizeLicense(obj["type"]);
      }
    }

    return "";
  }
}
