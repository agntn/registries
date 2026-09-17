import type { RegistryEntry } from "../core/registry.ts";

/**
 * Every adapter shipped with the package, in manifest order.
 *
 * Only the key and the default URL live here. The adapter module is imported on the first
 * `create()` for its key, so nothing runs when the package is imported and a bundler splits each
 * adapter into its own chunk. An adapter missing from this list is invisible to `create()`.
 */
export const builtins: readonly RegistryEntry[] = [
  {
    ecosystem: "npm",
    defaultURL: "https://registry.npmjs.org",
    load: () => import("./npm.ts").then((m) => m.NpmRegistry),
  },
  {
    ecosystem: "cargo",
    defaultURL: "https://crates.io",
    load: () => import("./cargo.ts").then((m) => m.CargoRegistry),
  },
  {
    ecosystem: "pypi",
    defaultURL: "https://pypi.org",
    load: () => import("./pypi.ts").then((m) => m.PyPIRegistry),
  },
  {
    ecosystem: "gem",
    defaultURL: "https://rubygems.org",
    load: () => import("./rubygems.ts").then((m) => m.RubyGemsRegistry),
  },
  {
    ecosystem: "composer",
    defaultURL: "https://packagist.org",
    load: () => import("./packagist.ts").then((m) => m.PackagistRegistry),
  },
  {
    ecosystem: "alpm",
    defaultURL: "https://archlinux.org",
    load: () => import("./alpm.ts").then((m) => m.AlpmRegistry),
  },
];
