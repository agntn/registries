/** One row of the ecosystem table, shared by the landing grid, the sidebar icons, the explorer and the facts strip. */
export interface EcosystemInfo {
  /** Ecosystem key, the `type` of a PURL and the value of `registry.ecosystem()`. */
  readonly key: string;
  readonly label: string;
  readonly icon: string;
  /** Class exported from `@agntn/registries`. */
  readonly className: string;
  /** Default API base URL passed to the constructor. */
  readonly baseURL: string;
  /** Human host of the registry. */
  readonly host: string;
  /** PURL with the namespace rules of the ecosystem. */
  readonly purl: string;
  /** Example package used by the landing and the explorer. */
  readonly example: string;
  /** How the ecosystem marks a version that should not be used. */
  readonly statuses: string;
  /** What the maintainers call answers with. */
  readonly maintainers: string;
  readonly to: string;
}

export const ECOSYSTEMS: readonly EcosystemInfo[] = [
  {
    key: "npm",
    label: "npm",
    icon: "i-simple-icons-npm",
    className: "NpmRegistry",
    baseURL: "https://registry.npmjs.org",
    host: "registry.npmjs.org",
    purl: "pkg:npm/@scope/name",
    example: "pkg:npm/lodash",
    statuses: "deprecated",
    maintainers: "maintainers, author, contributors",
    to: "/registries/npm",
  },
  {
    key: "cargo",
    label: "crates.io",
    icon: "i-simple-icons-rust",
    className: "CargoRegistry",
    baseURL: "https://crates.io",
    host: "crates.io",
    purl: "pkg:cargo/name",
    example: "pkg:cargo/serde",
    statuses: "yanked",
    maintainers: "owner users",
    to: "/registries/cargo",
  },
  {
    key: "pypi",
    label: "PyPI",
    icon: "i-simple-icons-pypi",
    className: "PyPIRegistry",
    baseURL: "https://pypi.org",
    host: "pypi.org",
    purl: "pkg:pypi/name",
    example: "pkg:pypi/flask",
    statuses: "yanked",
    maintainers: "author",
    to: "/registries/pypi",
  },
  {
    key: "gem",
    label: "RubyGems",
    icon: "i-simple-icons-rubygems",
    className: "RubyGemsRegistry",
    baseURL: "https://rubygems.org",
    host: "rubygems.org",
    purl: "pkg:gem/name",
    example: "pkg:gem/rails",
    statuses: "yanked",
    maintainers: "owners",
    to: "/registries/rubygems",
  },
  {
    key: "composer",
    label: "Packagist",
    icon: "i-simple-icons-composer",
    className: "PackagistRegistry",
    baseURL: "https://packagist.org",
    host: "packagist.org",
    purl: "pkg:composer/vendor/name",
    example: "pkg:composer/laravel/framework",
    statuses: "none",
    maintainers: "authors across versions, deduplicated",
    to: "/registries/packagist",
  },
  {
    key: "alpm",
    label: "Arch Linux",
    icon: "i-simple-icons-archlinux",
    className: "AlpmRegistry",
    baseURL: "https://archlinux.org",
    host: "archlinux.org, aur.archlinux.org",
    purl: "pkg:alpm/arch/name · pkg:alpm/aur/name",
    example: "pkg:alpm/arch/pacman",
    statuses: "deprecated when flagged out of date",
    maintainers: "maintainers, AUR maintainer",
    to: "/registries/alpm",
  },
];

const BY_KEY = new Map(ECOSYSTEMS.map((ecosystem) => [ecosystem.key, ecosystem]));

export function ecosystemInfo(key: string): EcosystemInfo | undefined {
  return BY_KEY.get(key);
}

export function ecosystemLabel(key: string): string {
  return ecosystemInfo(key)?.label ?? key;
}

/** The `type` of a PURL or shorthand, without parsing the rest of it. */
export function ecosystemOf(purl: string): string {
  const withoutScheme = purl.trim().replace(/^pkg:/u, "");
  const slash = withoutScheme.indexOf("/");
  return (slash === -1 ? withoutScheme : withoutScheme.slice(0, slash)).toLowerCase();
}
