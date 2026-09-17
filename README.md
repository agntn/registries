# @agntn/registries

[![npm version](https://npmx.dev/api/registry/badge/version/@agntn/registries)](https://npmx.dev/package/@agntn/registries)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads/@agntn/registries)](https://npmx.dev/package/@agntn/registries)
[![license](https://npmx.dev/api/registry/badge/license/@agntn/registries)](https://npmx.dev/package/@agntn/registries)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/agntn/registries)

📦 Six package registries, one `Package`. npm, crates.io, PyPI, RubyGems, Packagist and Arch Linux answer the same question with the same object, from your terminal, your TypeScript or your agent, and `pkg:npm/lodash` is the whole address.

## Why?

Every registry knows the same things about a package and has its own way of handing them over. npm puts everything in one JSON, crates.io splits it over three endpoints, PyPI keeps the license in a different field depending on the year, RubyGems answers owners separately, and Arch is two registries wearing one PURL type. Wire those into one script and you're maintaining six clients for one question. So this is one `Registry` class in front of all of them, addressed by [package URL](https://github.com/package-url/purl-spec), and the only thing that changes between `pkg:npm/lodash` and `pkg:cargo/serde` is the string.

The docs, plus a lookup page you can point at any PURL: [registries.agntn.dev](https://registries.agntn.dev).

## ✨ Features

- 🧩 **Six registries, same object.** npm, crates.io, PyPI, RubyGems, Packagist and Arch Linux, official repos and the AUR both, and `Package`, `Version`, `Dependency` and `Maintainer` have the same fields on every one of them.
- 🔗 **PURL is the address.** `pkg:npm/lodash`, `pkg:cargo/serde@1.0.229`, `pkg:alpm/aur/paru`, the [ECMA-427](https://github.com/package-url/purl-spec) package URL goes in everywhere, and the CLI doesn't even make you type `pkg:`.
- 🏷️ **Licenses as SPDX.** `MIT License` becomes `MIT` and `Apache 2.0` becomes `Apache-2.0`, so a license from PyPI compares to a license from crates.io without a regex in between.
- 💾 **Cache with a lockfile.** An hour for metadata, half an hour for versions, a day for dependencies and maintainers, and a sha256 on every entry so a mangled file gets refetched instead of trusted.
- ⌨️ **A CLI that pipes.** `registries info npm/lodash` for your eyes, `--json` for the exact object the library returns, `--no-cache` for when you don't believe yesterday.
- 🔁 **Retries you don't write.** Five retries with exponential backoff, `Retry-After` respected on a 429, and a `rateLimiter` slot if a registry has opinions about your pace.
- 📚 **Bulk lookups that skip, not fail.** `bulkFetchPackages` takes a list, runs fifteen at a time, and a package that fails is simply missing from the `Map` instead of taking the batch down with it.
- 🤖 **CLI, library, AI SDK, MCP, Pi and OMP.** Six read-only tools on the last three, one `packageTool` with five operations on `@agntn/registries/ai`.
- 🪶 **ESM only.** Built with [obuild](https://github.com/unjs/obuild), no CommonJS, Node.js 22.6 or newer.

## 📦 Install

```bash
pnpm add @agntn/registries
```

Node.js 22.6 or newer. Only the AI SDK tool on `@agntn/registries/ai` needs `ai` and `zod`, so they're optional peers, add them if you use it:

```bash
pnpm add ai zod
```

## 🚀 First call

```bash
npx @agntn/registries info npm/lodash
```

```
  lodash@4.18.1
  Lodash modular utilities.

  License:    MIT
  Repository: https://github.com/lodash/lodash
  Homepage:   https://lodash.com/
  Registry:   https://www.npmjs.com/package/lodash
  Keywords:   modules, stdlib, util
  Ecosystem:  npm
```

No key, no config, no `pkg:`. `npm/lodash` is enough on the command line, the library wants the full `pkg:npm/lodash`. Same command, a crate:

```bash
registries info cargo/serde
```

```
  serde@1.0.229
  A generic serialization/deserialization framework

  License:    MIT OR Apache-2.0
  Repository: https://github.com/serde-rs/serde
  Homepage:   https://serde.rs
  Docs:       https://docs.rs/serde
  Registry:   https://crates.io/crates/serde
  Keywords:   no_std, serde, serialization
  Ecosystem:  cargo
```

Same lines, other registry, and `Docs` shows up because crates.io knows about docs.rs. Versions come twenty at a time, newest first, `--limit` for more or fewer:

```bash
registries versions gem/rails --limit 5
```

```
  rails — 519 versions

  8.0.5.1  2026-07-29
  7.2.3.2  2026-07-29
  8.1.3.1  2026-07-29
  8.1.3  2026-03-24
  8.0.5  2026-03-24

  ... and 514 more (use --limit to show more)
```

Three branches patched on the same Wednesday. Somebody at Rails had a day ;)

No version on `deps`? It takes the latest and tells you which one it picked:

```bash
registries deps alpm/aur/paru
```

```
ℹ No version specified, using latest: 2.1.0-2

  aur/paru@2.1.0-2 — 6 dependencies

  runtime (3)
    git
    pacman
    libalpm.so >=14

  build (1)
    cargo

  optional (2)
    bat  (optional)
    devtools  (optional)
```

An AUR helper that depends on pacman, which is only fair. Official packages don't need the namespace, `alpm/pacman` means `alpm/arch/pacman`. The AUR you have to say out loud.

A few more, same rules:

```bash
registries deps pypi/flask@3.1.1
registries maintainers gem/rails
registries info composer/laravel/framework
registries info npm/@vue/reactivity
registries versions cargo/serde --json
registries cache status
```

### Commands

| Command       | What it does                                                        | Example                                   |
| ------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| `info`        | Name, latest version, license, repository, docs, keywords           | `registries info npm/lodash`              |
| `versions`    | Versions newest first, twenty unless you `--limit`                  | `registries versions gem/rails --limit 5` |
| `deps`        | Dependencies of one version, grouped by scope                       | `registries deps pypi/flask@3.1.1`        |
| `maintainers` | Who publishes it, with login, email and role when the registry says | `registries maintainers gem/rails`        |
| `cache`       | `status`, `path`, `prune` and `clear` for the local cache           | `registries cache status`                 |
| `mcp`         | The MCP server on stdio                                             | `registries mcp`                          |

`--json` and `--no-cache` work on every lookup, `--limit` on `versions` only. Where the cache lives and what each command prints, line by line: [CLI guide](https://registries.agntn.dev/guide/cli).

## 🧠 Library

```ts
import {
  fetchPackageFromPURL,
  fetchDependenciesFromPURL,
  createCached,
  parsePURL,
} from "@agntn/registries";

const lodash = await fetchPackageFromPURL("pkg:npm/lodash");
console.log(lodash.latestVersion, lodash.licenses, lodash.repository);
// 4.18.1 MIT https://github.com/lodash/lodash

const deps = await fetchDependenciesFromPURL("pkg:pypi/flask@3.1.1");
console.log(deps.map((dep) => `${dep.name} ${dep.requirements}`));
// [ 'blinker >=1.9.0', 'click >=8.1.3', 'importlib-metadata >=3.6.0', ... ]

const npm = createCached("npm");
await npm.fetchPackage("lodash"); // the network
await npm.fetchPackage("lodash"); // the cache, for the next hour

parsePURL("pkg:npm/%40vue/core@3.5.0");
// { type: 'npm', namespace: '@vue', name: 'core', version: '3.5.0', qualifiers: {}, subpath: '' }
```

Nine lines and you've seen most of it. Four `...FromPURL` helpers and `bulkFetchPackages` for a list, `create("npm")` when you'd rather hold the adapter yourself, `createFromPURL` when you want the adapter, the name and the version pulled apart, `createCached("npm")` for the same adapter with the cache in front, or `new CachedRegistry(adapter)` around one you already built. The cache is a directory, `~/.cache/registries` on Linux, `Library/Caches` on macOS, `LOCALAPPDATA` on Windows, `REGISTRIES_CACHE_DIR` if you disagree, and anywhere without a filesystem you hand `configureStorage` an [unstorage](https://unstorage.unjs.io) driver instead. Errors are one family: `NotFoundError` when the package isn't there, `InvalidPURLError` when the string doesn't start with `pkg:`, `UnknownEcosystemError` for `pkg:hex/...`, `RateLimitError` with the seconds the registry asked for, `HTTPError` for the rest. Longer versions of all of that: [PURL](https://registries.agntn.dev/guide/purl), [Lookups](https://registries.agntn.dev/guide/lookups), [Cache](https://registries.agntn.dev/guide/cache).

## 🗺️ Registries

| Ecosystem  | PURL type          | Talks to                         | Example                             |
| ---------- | ------------------ | -------------------------------- | ----------------------------------- |
| npm        | `pkg:npm/...`      | registry.npmjs.org               | `npm/@vue/reactivity`               |
| Cargo      | `pkg:cargo/...`    | crates.io                        | `cargo/serde@1.0.229`               |
| PyPI       | `pkg:pypi/...`     | pypi.org                         | `pypi/flask@3.1.1`                  |
| RubyGems   | `pkg:gem/...`      | rubygems.org                     | `gem/rails`                         |
| Packagist  | `pkg:composer/...` | packagist.org                    | `composer/laravel/framework`        |
| Arch Linux | `pkg:alpm/...`     | archlinux.org, aur.archlinux.org | `alpm/arch/pacman`, `alpm/aur/paru` |

Scoped npm packages are `pkg:npm/%40vue/reactivity` as a proper PURL and `npm/@vue/reactivity` on the CLI, both land in the same place. Arch is the one where the namespace matters: `arch` is the default, so `alpm/pacman` is the official package, and `aur` you spell out. Each registry has its own page with the endpoints it calls and the names it refuses: [Registries](https://registries.agntn.dev/registries).

## 🤖 Agents

```bash
registries mcp
pi install npm:@agntn/registries
omp install @agntn/registries
```

```json
{
  "mcpServers": {
    "registries": { "command": "npx", "args": ["-y", "@agntn/registries", "mcp"] }
  }
}
```

Six read-only tools, `registries_package` through `registries_ecosystems`, the same six on MCP, Pi and OMP, and `registries_bulk_packages` takes fifty PURLs in one call. For the AI SDK there's `packageTool` on `@agntn/registries/ai`, one tool with five operations and the same helpers underneath: [Agents guide](https://registries.agntn.dev/guide/agents). And remember whose text that is: a description, a keyword, a maintainer name, all of it was typed by whoever published the package, so it's something to report, never something to obey.

## 🚫 What this does not do

Install anything. No tarballs, no `node_modules`, no `pip install`, it reads what a registry says about a package and stops there. No semver solving either, `pkg:npm/lodash@^4` is a package that doesn't exist, give it an exact version or let it pick the latest. And no vulnerability feeds, that's a different job.

## 🧩 Adding a registry

Want a seventh? One class extending `Registry` with the six methods, then `register("hex", "https://hex.pm", HexRegistry)`, and `pkg:hex/phoenix` resolves through `create()` and every helper the way the built-ins do. The guide builds exactly that adapter for Hex, start to finish: [Custom registries](https://registries.agntn.dev/guide/custom).

## 🛠️ Development

```bash
pnpm install
pnpm dev:prepare   # obuild --stub, so src/ changes show up without a build
pnpm fmt           # oxlint --fix and oxfmt
pnpm lint          # builds first, then oxlint and oxfmt --check
pnpm typecheck     # library and tests, then a build and the two extensions
pnpm test:run
pnpm build         # obuild
pnpm docs          # the Docus site on :3000, after pnpm build
```

## 💛 Thanks

Anthropic and OpenAI both run a program for open source, [Claude for Open Source](https://claude.com/contact-sales/claude-for-oss) and [Codex for Open Source](https://developers.openai.com/community/codex-for-oss), and this package is one of the things that came out of them <3

## 📄 License

[MIT](./LICENSE)
