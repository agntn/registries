import type { Client } from "../core/client.ts";
import type { Dependency, Maintainer, Package, URLBuilder, Version } from "../core/types.ts";
import { Registry } from "../core/registry.ts";
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
    license: string | null;
    license_expression?: string | null;
    keywords: string;
    author: string | null;
    author_email: string | null;
    maintainer?: string | null;
    maintainer_email?: string | null;
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

/**
 * PEP 639 projects put the SPDX expression in `license_expression` and leave `license` null.
 *
 * @param info - License fields of the JSON API `info` object.
 * @returns {string} The normalized SPDX expression, or an empty string.
 */
function pypiLicense(
  info: Readonly<Pick<PyPIPackageResponse["info"], "license" | "license_expression">>,
): string {
  return normalizeLicense(info.license_expression || info.license);
}

interface PyPIContact {
  readonly name: string;
  readonly email: string;
}

const QUOTED_NAME_PATTERN = /^"((?:[^"\\]|\\.)*)"\s*<([^>]*)>$/;
const ANGLE_ADDRESS_PATTERN = /^([^<]*?)\s*<([^>]*)>$/;
const COMMENT_PATTERN = /\(([^)]*)\)/g;
const ADDRESS_ITEM_PATTERN = /(?:"(?:[^"\\]|\\.)*"|<[^>]*>|\([^)]*\)|[^,])+/g;

/**
 * Split an address list on the commas outside quotes, angle brackets and one level of comments.
 *
 * @param value - Comma separated mailboxes.
 * @returns {string[]} The trimmed, non-empty items.
 */
function splitAddressList(value: string): string[] {
  return [...value.matchAll(ADDRESS_ITEM_PATTERN)].map(([item]) => item.trim()).filter(Boolean);
}

/**
 * Read one mailbox; a comment names a bare address, and a bare name has no address.
 *
 * @param item - One item of an address list.
 * @returns {PyPIContact} The name and email found in it.
 */
function parseMailbox(item: string): PyPIContact {
  const quoted = item.match(QUOTED_NAME_PATTERN);
  if (quoted) {
    return { name: quoted[1]!.replaceAll(/\\(.)/g, "$1").trim(), email: quoted[2]!.trim() };
  }

  const comments: string[] = [];
  const bare = item
    .replaceAll(COMMENT_PATTERN, (_match: string, comment: string) => {
      comments.push(comment.trim());
      return " ";
    })
    .trim();
  const comment = comments.filter(Boolean).join(" ");
  const angled = bare.match(ANGLE_ADDRESS_PATTERN);
  if (angled) return { name: angled[1]!.trim() || comment, email: angled[2]!.trim() };
  return bare.includes("@") ? { name: comment, email: bare } : { name: bare || comment, email: "" };
}

/**
 * PEP 621 keeps people without an email in the name field, so the label stays its own entry.
 *
 * @param name - The `author` or `maintainer` field.
 * @param emails - The matching `author_email` or `maintainer_email` field.
 * @returns {PyPIContact[]} One contact per person.
 */
function pypiContacts(
  name: string | null | undefined,
  emails: string | null | undefined,
): PyPIContact[] {
  const label = name?.trim() ?? "";
  const contacts = splitAddressList(emails ?? "").map(parseMailbox);

  if (!label) return contacts;
  if (contacts.length === 1 && !contacts[0]!.name) {
    return [{ name: label, email: contacts[0]!.email }];
  }
  if (contacts.some((contact) => contact.name.toLowerCase() === label.toLowerCase())) {
    return contacts;
  }
  return [{ name: label, email: "" }, ...contacts];
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

      const licenses = pypiLicense(info);
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
      const { info } = await this.client.getJSON<PyPIPackageResponse>(url, signal);
      const groups = [
        ["author", pypiContacts(info.author, info.author_email)],
        ["maintainer", pypiContacts(info.maintainer, info.maintainer_email)],
      ] as const;
      const seen = new Set<string>();
      const maintainers: Maintainer[] = [];

      for (const [role, contacts] of groups) {
        for (const contact of contacts) {
          const key = (contact.email || contact.name).toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          maintainers.push({
            uuid: "",
            login: contact.email ? contact.email.split("@")[0]! : "",
            name: contact.name,
            email: contact.email,
            url: "",
            role,
          });
        }
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
