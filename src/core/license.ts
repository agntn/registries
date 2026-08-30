/**
 * Normalize common license names to SPDX expressions.
 *
 * @param raw - License name or SPDX expression.
 * @returns {string} The normalized SPDX expression, or an empty string.
 */
export function normalizeLicense(raw: string | null | undefined): string {
  if (!raw) return "";

  const trimmed = raw.trim();
  if (!trimmed) return "";

  // Common mappings
  const lower = trimmed.toLowerCase();
  const known = LICENSE_MAP.get(lower);
  if (known) return known;

  // Already looks like SPDX — return as-is
  return trimmed;
}

const LICENSE_MAP = new Map<string, string>([
  ["mit license", "MIT"],
  ["mit", "MIT"],
  ["apache license 2.0", "Apache-2.0"],
  ["apache 2.0", "Apache-2.0"],
  ["apache-2.0", "Apache-2.0"],
  ["apache license, version 2.0", "Apache-2.0"],
  ["apache2", "Apache-2.0"],
  ["bsd-2-clause", "BSD-2-Clause"],
  ["bsd-3-clause", "BSD-3-Clause"],
  ["bsd 2-clause", "BSD-2-Clause"],
  ["bsd 3-clause", "BSD-3-Clause"],
  ["simplified bsd license", "BSD-2-Clause"],
  ["new bsd license", "BSD-3-Clause"],
  ["isc license", "ISC"],
  ["isc", "ISC"],
  ["gpl-2.0", "GPL-2.0-only"],
  ["gpl-3.0", "GPL-3.0-only"],
  ["gpl-2.0-only", "GPL-2.0-only"],
  ["gpl-3.0-only", "GPL-3.0-only"],
  ["lgpl-2.1", "LGPL-2.1-only"],
  ["lgpl-3.0", "LGPL-3.0-only"],
  ["mpl-2.0", "MPL-2.0"],
  ["mozilla public license 2.0", "MPL-2.0"],
  ["unlicense", "Unlicense"],
  ["the unlicense", "Unlicense"],
  ["cc0-1.0", "CC0-1.0"],
  ["cc0", "CC0-1.0"],
  ["public domain", "Unlicense"],
  ["zlib", "Zlib"],
  ["wtfpl", "WTFPL"],
  ["artistic-2.0", "Artistic-2.0"],
  ["boost software license 1.0", "BSL-1.0"],
  ["bsl-1.0", "BSL-1.0"],
]);

/**
 * Combine license strings into one SPDX expression.
 *
 * @param licenses - License names or expressions to normalize.
 * @param operator - SPDX operator joining multiple licenses.
 * @returns {string} The combined SPDX expression, or an empty string.
 */
export function combineLicenses(
  licenses: readonly (string | null | undefined)[],
  operator: "OR" | "AND" = "OR",
): string {
  const normalized = licenses.map((l) => normalizeLicense(l)).filter(Boolean);

  if (normalized.length === 0) return "";
  if (normalized.length === 1) return normalized[0]!;
  return normalized.join(` ${operator} `);
}
