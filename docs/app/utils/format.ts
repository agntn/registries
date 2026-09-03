/** `2024-01-20T14:25:10.000Z` → `2024-01-20`. */
export function dateOnly(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

/** `2024-01-20T14:25:10.000Z` → `2024-01-20 14:25`. */
export function shortStamp(iso: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/u.exec(iso);
  return match ? `${match[1]} ${match[2]}` : iso;
}

/** Keeps the start and the end of a long value: `sha512-abc…xyz`. */
export function shortValue(value: string, max = 40): string {
  if (value.length <= max) {
    return value;
  }
  const head = Math.ceil((max - 1) * 0.6);
  const tail = max - 1 - head;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** Strips the scheme for display: `https://github.com/lodash/lodash` → `github.com/lodash/lodash`. */
export function bareUrl(url: string): string {
  return url.replace(/^https?:\/\//u, "").replace(/\/$/u, "");
}

/** Adds the `pkg:` scheme the CLI makes optional. */
export function withScheme(purl: string): string {
  const trimmed = purl.trim();
  return trimmed.startsWith("pkg:") ? trimmed : `pkg:${trimmed}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Namespace-qualified name, without doubling it when the registry already includes the namespace (Packagist, Arch). */
export function displayName(pkg: { readonly name: string; readonly namespace: string }): string {
  if (!pkg.namespace || pkg.name.includes("/")) {
    return pkg.name;
  }
  return `${pkg.namespace}/${pkg.name}`;
}
