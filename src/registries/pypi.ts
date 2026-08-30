import type { Client } from "../core/client.ts";
import type { Dependency, Maintainer, Package, URLBuilder, Version } from "../core/types.ts";
import { Registry, register } from "../core/registry.ts";
import { normalizeLicense } from "../core/license.ts";
import { normalizeRepositoryURL } from "../core/repository.ts";
import { buildPURL } from "../core/purl.ts";
import { rethrowFetchError } from "./error.ts";

const PYPI_FILENAME_SEPARATORS = ["_", "-", "."] as const;

/** PyPI JSON API response for a package. */
interface PyPIPackageResponse {
  info: {
    name: string;
    version: string;
    summary: string;
    description: string;
    license: string;
    keywords: string;
    author: string;
    author_email: string;
    project_urls: Record<string, string>;
    requires_dist: string[] | null;
  };
  urls: PyPIFile[];
}

/** PyPI file information. */
interface PyPIFile {
  filename: string;
  url: string;
  upload_time_iso_8601: string;
  yanked: boolean;
  digests: {
    sha256: string;
  };
}

/** PyPI Simple API (PEP 691) response for a project. */
interface PyPISimpleResponse {
  meta: { "api-version": string };
  name: string;
  versions: string[];
  files: PyPISimpleFile[];
}

/** A single file entry in the Simple API response. */
interface PyPISimpleFile {
  readonly filename: string;
  readonly url: string;
  readonly hashes: Readonly<{ sha256?: string }>;
  readonly "requires-python"?: string;
  readonly yanked?: string | false;
  readonly "upload-time"?: string;
}

/** PyPI registry client. */
export class PyPIRegistry extends Registry {
  constructor(baseURL: string, client: Client) {
    super();
    this.baseURL = baseURL;
    this.client = client;
  }

  readonly baseURL: string;
  readonly client: Client;

  private readonly downloadUrls = new Map<string, string>();

  ecosystem(): string {
    return "pypi";
  }

  async fetchPackage(name: string, signal?: AbortSignal): Promise<Package> {
    const normalized = this.normalizeName(name);
    const url = `${this.baseURL}/pypi/${normalized}/json`;

    try {
      const data = await this.client.getJSON<PyPIPackageResponse>(url, signal);
      const info = data.info;

      const licenses = normalizeLicense(info.license);
      const repository = this.extractRepository(info.project_urls);
      const keywords = this.parseKeywords(info.keywords);

      return {
        name: info.name,
        description: info.summary || info.description || "",
        homepage: this.findProjectUrl(info.project_urls, ["Homepage"]),
        documentation: this.findProjectUrl(info.project_urls, ["Documentation"]),
        repository,
        licenses,
        keywords,
        namespace: "",
        latestVersion: info.version,
        metadata: {},
      };
    } catch (error) {
      rethrowFetchError(error, this.ecosystem(), name);
    }
  }

  async fetchVersions(name: string, signal?: AbortSignal): Promise<Version[]> {
    const normalized = this.normalizeName(name);
    const url = `${this.baseURL}/simple/${normalized}/`;

    try {
      const data = await this.client.getJSON<PyPISimpleResponse>(url, signal, {
        Accept: "application/vnd.pypi.simple.v1+json",
      });

      const filesByVersion = this.indexFilesByVersion(normalized, data.versions, data.files);
      return [...filesByVersion].map(([version, files]) =>
        this.toVersion(normalized, version, files),
      );
    } catch (error) {
      rethrowFetchError(error, this.ecosystem(), name);
    }
  }

  async fetchDependencies(
    name: string,
    version: string,
    signal?: AbortSignal,
  ): Promise<Dependency[]> {
    const normalized = this.normalizeName(name);
    const url = `${this.baseURL}/pypi/${normalized}/${version}/json`;

    try {
      const data = await this.client.getJSON<PyPIPackageResponse>(url, signal);
      const dependencies: Dependency[] = [];

      if (data.info.requires_dist) {
        for (const depStr of data.info.requires_dist) {
          const dep = this.parsePEP508(depStr);
          if (dep) {
            dependencies.push(dep);
          }
        }
      }

      return dependencies;
    } catch (error) {
      rethrowFetchError(error, this.ecosystem(), name, version);
    }
  }

  async fetchMaintainers(name: string, signal?: AbortSignal): Promise<Maintainer[]> {
    const normalized = this.normalizeName(name);
    const url = `${this.baseURL}/pypi/${normalized}/json`;

    try {
      const data = await this.client.getJSON<PyPIPackageResponse>(url, signal);
      const maintainers: Maintainer[] = [];

      if (data.info.author || data.info.author_email) {
        maintainers.push({
          uuid: "",
          login: data.info.author_email ? data.info.author_email.split("@")[0] : "",
          name: data.info.author || "",
          email: data.info.author_email || "",
          url: "",
          role: "author",
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
        const normalized = this.normalizeName(name);
        const base = `https://pypi.org/project/${normalized}`;
        return version ? `${base}/${version}` : base;
      },
      download: (name: string, version: string) => {
        const normalized = this.normalizeName(name);
        return (
          this.downloadUrls.get(`${normalized}@${version}`) ??
          `https://pypi.org/project/${normalized}/${version}/`
        );
      },
      documentation: (name: string, _version?: string) => {
        const normalized = this.normalizeName(name);
        return `https://pypi.org/project/${normalized}`;
      },
      readme: (name: string, version?: string) => {
        const normalized = this.normalizeName(name);
        return version
          ? `https://pypi.org/project/${normalized}/${version}/`
          : `https://pypi.org/project/${normalized}/`;
      },
      purl: (name: string, version?: string) => {
        return buildPURL({ type: "pypi", name: this.normalizeName(name), version });
      },
    };
  }

  private indexFilesByVersion(
    normalizedName: string,
    versions: readonly string[],
    files: readonly PyPISimpleFile[],
  ): Map<string, PyPISimpleFile[]> {
    const filesByVersion = new Map<string, PyPISimpleFile[]>();

    for (const version of versions) filesByVersion.set(version, []);
    for (const file of files) {
      const version = this.matchFileVersion(file.filename, normalizedName, versions);
      if (version) filesByVersion.get(version)!.push(file);
    }

    return filesByVersion;
  }

  private toVersion(
    normalizedName: string,
    version: string,
    files: readonly PyPISimpleFile[],
  ): Version {
    if (files.length === 0) {
      return {
        number: version,
        publishedAt: null,
        licenses: "",
        integrity: "",
        status: "",
        metadata: {},
      };
    }

    const sdist = files.find((file) => file.filename.endsWith(".tar.gz"));
    const file = sdist ?? files[0]!;
    const publishedAt = file["upload-time"] ? new Date(file["upload-time"]) : null;
    const integrity = file.hashes?.sha256 ? `sha256-${file.hashes.sha256}` : "";
    const status = file.yanked ? "yanked" : "";

    this.downloadUrls.set(`${normalizedName}@${version}`, file.url);

    return {
      number: version,
      publishedAt,
      licenses: "",
      integrity,
      status,
      metadata: {},
    };
  }

  private matchFileVersion(
    filename: string,
    normalizedName: string,
    versions: readonly string[],
  ): string | undefined {
    const lower = filename.toLowerCase();
    let prefix: string | undefined;

    for (const separator of PYPI_FILENAME_SEPARATORS) {
      const candidate = normalizedName.replaceAll("-", separator) + "-";
      if (lower.startsWith(candidate)) {
        prefix = candidate;
        break;
      }
    }

    if (!prefix) return undefined;

    const afterPrefix = filename.slice(prefix.length);

    // Wheel: {name}-{version}-{python}-{abi}-{platform}.whl
    // Version is before the first dash after the prefix
    const dashIdx = afterPrefix.indexOf("-");
    if (dashIdx !== -1) {
      const candidate = afterPrefix.slice(0, dashIdx);
      if (versions.includes(candidate)) return candidate;
    }

    // Sdist: {name}-{version}.tar.gz / .zip / .tar.bz2
    const stripped = afterPrefix.replace(/\.(tar\.(gz|bz2|xz)|zip)$/i, "");
    if (versions.includes(stripped)) return stripped;

    return undefined;
  }

  private normalizeName(name: string): string {
    return name.toLowerCase().replaceAll(/[-_.]+/g, "-");
  }

  private extractRepository(projectUrls: Readonly<Record<string, string>> | undefined): string {
    const url = this.findProjectUrl(projectUrls, [
      "Repository",
      "Source",
      "Source Code",
      "GitHub",
      "Homepage",
    ]);
    return normalizeRepositoryURL(url);
  }

  private findProjectUrl(
    projectUrls: Readonly<Record<string, string>> | undefined,
    keys: readonly string[],
  ): string {
    if (!projectUrls) return "";

    const lowered = new Map<string, string>();
    for (const [k, v] of Object.entries(projectUrls)) {
      lowered.set(k.toLowerCase(), v);
    }

    for (const key of keys) {
      const value = lowered.get(key.toLowerCase());
      if (value) return value;
    }

    return "";
  }

  private parseKeywords(keywords: string | undefined): string[] {
    if (!keywords) return [];
    return keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }

  private parseExtraMarker(marker: string): Pick<Dependency, "optional" | "scope"> {
    const extraMatch = marker.match(/extra\s*==\s*["']([^"']+)["']/);
    if (!extraMatch) return { scope: "runtime", optional: false };

    const extraName = extraMatch[1]!.toLowerCase();
    if (/^dev(elop(ment)?)?$/.test(extraName)) {
      return { scope: "development", optional: true };
    }
    if (/^test(s|ing)?$/.test(extraName)) {
      return { scope: "test", optional: true };
    }
    return { scope: "runtime", optional: true };
  }

  private parsePEP508(depStr: string): Dependency | null {
    // PEP 508 format: name [extras] (version_spec) ; markers
    const semiIdx = depStr.indexOf(";");
    const mainPart = semiIdx === -1 ? depStr.trim() : depStr.slice(0, semiIdx).trim();
    const markerStr = semiIdx === -1 ? "" : depStr.slice(semiIdx + 1).trim();

    // Extract name, skip [extras] bracket group, capture version spec
    const match = mainPart.match(/^([a-zA-Z0-9._-]+)\s*(?:\[.*?\])?\s*(.*)$/);
    if (!match) return null;

    const depName = match[1]!;
    let versionSpec = match[2]!.trim();

    // Strip surrounding parentheses: "(<4,>=2)" -> "<4,>=2"
    if (versionSpec.startsWith("(") && versionSpec.endsWith(")")) {
      versionSpec = versionSpec.slice(1, -1).trim();
    }

    const marker = this.parseExtraMarker(markerStr);

    return {
      name: this.normalizeName(depName),
      requirements: versionSpec,
      scope: marker.scope,
      optional: marker.optional,
    };
  }
}

register("pypi", "https://pypi.org", PyPIRegistry);
