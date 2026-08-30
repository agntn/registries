type PrefixReplacement = readonly [prefix: string, replacement: string];

const REPOSITORY_SHORTHANDS: readonly PrefixReplacement[] = [
  ["github:", "https://github.com/"],
  ["gitlab:", "https://gitlab.com/"],
  ["bitbucket:", "https://bitbucket.org/"],
];

const GIT_TRANSPORTS: readonly PrefixReplacement[] = [
  ["git://", "https://"],
  ["ssh://git@", "https://"],
];

function extractRepositoryURL(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (typeof raw !== "object" || raw === null) return "";

  const url = (raw as Record<string, unknown>)["url"];
  return typeof url === "string" ? url : "";
}

function replacePrefix(value: string, replacements: readonly PrefixReplacement[]): string {
  for (const [prefix, replacement] of replacements) {
    if (value.startsWith(prefix)) return replacement + value.slice(prefix.length);
  }
  return value;
}

/**
 * Normalize repository shorthands and Git transports to HTTPS.
 *
 * @param raw - Repository URL string or object with a URL field.
 * @returns {string} The normalized URL, or an empty string.
 */
export function normalizeRepositoryURL(raw: unknown): string {
  let url = extractRepositoryURL(raw).trim();
  if (!url) return "";

  url = replacePrefix(url, REPOSITORY_SHORTHANDS);
  if (url.startsWith("git+")) url = url.slice(4);
  url = replacePrefix(url, GIT_TRANSPORTS);

  const sshMatch = url.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) url = `https://${sshMatch[1]}/${sshMatch[2]}`;

  return url.replace(/\/$/, "").replace(/\.git$/, "");
}
