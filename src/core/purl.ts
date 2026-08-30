import type { ParsedPURL } from "./types.ts";
import type { Client } from "./client.ts";
import { create, type Registry } from "./registry.ts";
import { InvalidPURLError } from "./errors.ts";

const QUALIFIER_KEY_PATTERN = /^[a-z][a-z0-9._-]*$/;

function decodePURLComponent(purlStr: string, value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new InvalidPURLError(purlStr, "malformed percent-encoding");
  }
}

function extractSubpath(purlStr: string, value: string): { remainder: string; subpath: string } {
  const hashIdx = value.indexOf("#");
  if (hashIdx === -1) return { remainder: value, subpath: "" };

  const subpath = value
    .slice(hashIdx + 1)
    .split("/")
    .map((segment) => decodePURLComponent(purlStr, segment))
    .join("/");
  return { remainder: value.slice(0, hashIdx), subpath };
}

function extractQualifiers(
  purlStr: string,
  value: string,
): { qualifiers: Record<string, string>; remainder: string } {
  const queryIdx = value.indexOf("?");
  if (queryIdx === -1) return { qualifiers: {}, remainder: value };

  const qualifiers: Record<string, string> = {};
  for (const pair of value.slice(queryIdx + 1).split("&")) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx !== -1) {
      qualifiers[decodePURLComponent(purlStr, pair.slice(0, eqIdx))] = decodePURLComponent(
        purlStr,
        pair.slice(eqIdx + 1),
      );
    }
  }
  return { qualifiers, remainder: value.slice(0, queryIdx) };
}

function extractVersion(purlStr: string, value: string): { remainder: string; version: string } {
  const lastSlashIdx = value.lastIndexOf("/");
  const lastAtIdx = value.lastIndexOf("@");
  if (lastAtIdx === -1 || lastAtIdx <= lastSlashIdx) return { remainder: value, version: "" };

  return {
    remainder: value.slice(0, lastAtIdx),
    version: decodePURLComponent(purlStr, value.slice(lastAtIdx + 1)),
  };
}

/**
 * Parse a package URL into normalized components.
 *
 * @param purlStr - Package URL to parse.
 * @returns {ParsedPURL} The normalized components.
 * @see https://github.com/package-url/purl-spec (ECMA-427)
 */
export function parsePURL(purlStr: string): ParsedPURL {
  if (!purlStr.startsWith("pkg:")) {
    throw new InvalidPURLError(purlStr, 'must start with "pkg:"');
  }

  const subpathParts = extractSubpath(purlStr, purlStr.slice(4));
  const qualifierParts = extractQualifiers(purlStr, subpathParts.remainder);
  const versionParts = extractVersion(purlStr, qualifierParts.remainder);
  const remainder = versionParts.remainder;

  // Extract type
  const slashIdx = remainder.indexOf("/");
  if (slashIdx === -1) {
    throw new InvalidPURLError(purlStr, "missing type/name separator");
  }

  const type = remainder.slice(0, slashIdx).toLowerCase();
  if (!type) {
    throw new InvalidPURLError(purlStr, "empty type");
  }

  const rest = remainder.slice(slashIdx + 1);
  if (!rest) {
    throw new InvalidPURLError(purlStr, "empty name");
  }

  // Extract namespace and name
  const lastSlashIdx = rest.lastIndexOf("/");
  let namespace = "";
  let name: string;

  if (lastSlashIdx !== -1) {
    namespace = rest
      .slice(0, lastSlashIdx)
      .split("/")
      .map((s) => decodePURLComponent(purlStr, s))
      .join("/");
    name = decodePURLComponent(purlStr, rest.slice(lastSlashIdx + 1));
  } else {
    name = decodePURLComponent(purlStr, rest);
  }

  // Ecosystem-specific normalization per PURL spec
  if (type === "pypi") {
    name = name.toLowerCase().replaceAll(/[-_.]+/g, "-");
  }

  if (type === "alpm") {
    name = name.toLowerCase();
  }

  return {
    type,
    namespace,
    name,
    version: versionParts.version,
    qualifiers: qualifierParts.qualifiers,
    subpath: subpathParts.subpath,
  };
}

/**
 * Build a registry package name from PURL components.
 *
 * @param parsed - Parsed package URL components.
 * @returns {string} The namespace-qualified package name.
 */
export function fullName(parsed: ParsedPURL): string {
  if (parsed.namespace) {
    return `${parsed.namespace}/${parsed.name}`;
  }
  return parsed.name;
}

/**
 * Create a registry from a package URL.
 *
 * @param purlStr - Package URL to resolve.
 * @param client - Optional HTTP client.
 * @returns {[Registry, string, string]} The registry, package name, and version.
 */
export function createFromPURL(purlStr: string, client?: Client): [Registry, string, string] {
  const parsed = parsePURL(purlStr);
  const baseURL = parsed.qualifiers["repository_url"] ?? "";
  const reg = create(parsed.type, baseURL || undefined, client);
  return [reg, fullName(parsed), parsed.version];
}

/**
 * Build a package URL from normalized components.
 *
 * @param parts - Package URL components.
 * @returns {string} The canonical package URL.
 */
export function buildPURL(
  parts: Readonly<{
    type: string;
    name: string;
    version?: string;
    namespace?: string;
    qualifiers?: Readonly<Record<string, string>>;
    subpath?: string;
  }>,
): string {
  let purl = `pkg:${parts.type}/`;
  if (parts.namespace) {
    purl += `${parts.namespace
      .split("/")
      .map((s) => encodeURIComponent(s))
      .join("/")}/`;
  }
  purl += encodeURIComponent(parts.name);
  if (parts.version) {
    purl += `@${encodeURIComponent(parts.version)}`;
  }
  if (parts.qualifiers && Object.keys(parts.qualifiers).length > 0) {
    const qualifiers = new Map<string, string>();
    for (const [key, value] of Object.entries(parts.qualifiers)) {
      const canonicalKey = key.toLowerCase();
      if (!QUALIFIER_KEY_PATTERN.test(canonicalKey)) {
        throw new InvalidPURLError(purl, `invalid qualifier key "${key}"`);
      }
      if (qualifiers.has(canonicalKey)) {
        throw new InvalidPURLError(purl, `duplicate qualifier key "${canonicalKey}"`);
      }
      qualifiers.set(canonicalKey, value);
    }
    const qs = [...qualifiers]
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");
    purl += `?${qs}`;
  }
  if (parts.subpath) {
    purl += `#${parts.subpath
      .split("/")
      .map((s) => encodeURIComponent(s))
      .join("/")}`;
  }
  return purl;
}
