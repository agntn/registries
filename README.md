# @agntn/registries

[![npm version](https://npmx.dev/api/registry/badge/version/@agntn/registries)](https://npmx.dev/package/@agntn/registries)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads/@agntn/registries)](https://npmx.dev/package/@agntn/registries)
[![license](https://npmx.dev/api/registry/badge/license/@agntn/registries)](https://npmx.dev/package/@agntn/registries)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/agntn/registries)

📦 Six package registries, one `Package`. Ask npm, crates.io, PyPI, RubyGems, Packagist or the AUR about a package and the same object comes back, from your terminal, your TypeScript or your agent. `pkg:npm/lodash` is the whole address.

## Why?

Six registries, six APIs, and no two of them agree on what a package looks like. npm dumps one big JSON, crates.io makes you ask three times, PyPI has two license fields and which one is filled depends on how old the upload is, and Arch is two registries wearing one PURL type. Write a client for each and you've got six clients for one question, and a license wrong somewhere, everyone does. So: one `Registry` in front of all of them, addressed by [package URL](https://github.com/package-url/purl-spec), and `pkg:cargo/serde` is just `pkg:npm/lodash` with a different string.

Everything longer than this file is at [registries.agntn.dev](https://registries.agntn.dev), lookup page included, it runs the library live.

## ✨ Features

- 🧩 **Six registries, one shape.** npm, crates.io, PyPI, RubyGems, Packagist, Arch with the AUR. `Package`, `Version`, `Dependency`, `Maintainer`, same fields everywhere.
- 🔗 **PURL is the address.** `pkg:cargo/serde@1.0.229`, `pkg:alpm/aur/paru`, that's [ECMA-427](https://github.com/package-url/purl-spec) and it goes in everywhere. The CLI lets you skip the `pkg:`.
- 🏷️ **Licenses come back as SPDX.** `MIT License` is `MIT`, `Apache 2.0` is `Apache-2.0`, compare them without a regex.
- 💾 **Cache with a lockfile.** An hour for metadata, half an hour for versions, a day for deps and maintainers, sha256 on every entry.
- ⌨️ **A CLI that pipes.** `--json` is exactly what the library returns, `--no-cache` for when you don't trust yesterday.
- 🔁 **Retries you don't write.** Five of them, exponential backoff, `Retry-After` respected when a registry says 429.
- 📚 **Bulk that shrugs.** Fifteen packages at a time, and one that fails is just missing from the answer, not an exception for everyone else.
- 🤖 **Library, CLI, AI SDK, MCP, Pi and OMP.** Six read-only tools on the agent side, same code behind all of them.
- 🪶 **ESM only.** [obuild](https://github.com/unjs/obuild), no CommonJS, Node.js 22.6 or newer.

## 📦 Install

```bash
pnpm add @agntn/registries
```

Node.js 22.6 or newer. `ai` and `zod` only if you want the AI SDK tool, nothing else touches them:

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

No key, no config, no `pkg:`. And it really doesn't care which registry, try a crate:

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

Same lines, plus `Docs`, because crates.io knows about docs.rs. Nice of them. Versions come twenty at a time, `--limit` if that's too many or too few:

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

No version on `deps`? It takes the latest and says so:

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

An AUR helper that depends on pacman. Fair enough. `alpm/pacman` is short for `alpm/arch/pacman`, the AUR you have to name.

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

| Command       | What it does                                       | Example                                   |
| ------------- | -------------------------------------------------- | ----------------------------------------- |
| `info`        | Name, latest version, license, repo, docs          | `registries info npm/lodash`              |
| `versions`    | Newest first, twenty unless you `--limit`          | `registries versions gem/rails --limit 5` |
| `deps`        | One version's dependencies, grouped by scope       | `registries deps pypi/flask@3.1.1`        |
| `maintainers` | Who publishes it, email and role when there is one | `registries maintainers gem/rails`        |
| `cache`       | `status`, `path`, `prune`, `clear`                 | `registries cache status`                 |
| `mcp`         | The MCP server on stdio                            | `registries mcp`                          |

`--json` and `--no-cache` on every lookup, `--limit` on `versions`. Where the cache lives and what each command prints is in the [CLI guide](https://registries.agntn.dev/guide/cli).

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

That's the library, more or less. `bulkFetchPackages` for a list, `create("npm")` if you'd rather hold the adapter yourself, `createCached("npm")` for the same thing with the cache in front. Errors are one family, `NotFoundError`, `InvalidPURLError`, `UnknownEcosystemError`, `RateLimitError`, `HTTPError`, and you can guess which is which. Cache directory, storage drivers and the rest of the API: [Lookups](https://registries.agntn.dev/guide/lookups), [PURL](https://registries.agntn.dev/guide/purl), [Cache](https://registries.agntn.dev/guide/cache).

## 🗺️ Registries

| Ecosystem  | PURL type          | Talks to                         | Example                             |
| ---------- | ------------------ | -------------------------------- | ----------------------------------- |
| npm        | `pkg:npm/...`      | registry.npmjs.org               | `npm/@vue/reactivity`               |
| Cargo      | `pkg:cargo/...`    | crates.io                        | `cargo/serde@1.0.229`               |
| PyPI       | `pkg:pypi/...`     | pypi.org                         | `pypi/flask@3.1.1`                  |
| RubyGems   | `pkg:gem/...`      | rubygems.org                     | `gem/rails`                         |
| Packagist  | `pkg:composer/...` | packagist.org                    | `composer/laravel/framework`        |
| Arch Linux | `pkg:alpm/...`     | archlinux.org, aur.archlinux.org | `alpm/arch/pacman`, `alpm/aur/paru` |

Scoped npm is `npm/@vue/reactivity` on the CLI and `pkg:npm/%40vue/reactivity` as a proper PURL, both fine. Arch is the one with a namespace, `arch` by default, `aur` when you mean it. One page per registry: [Registries](https://registries.agntn.dev/registries).

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

The agent side is six read-only tools, `registries_package` through `registries_ecosystems`, and MCP, Pi and OMP all run the same code behind them. The AI SDK gets `packageTool` from `@agntn/registries/ai`, one tool, five operations: [Agents guide](https://registries.agntn.dev/guide/agents). And whatever a package says about itself was typed by whoever published it, so it's data for the model, not orders.

## 🚫 What this does not do

Install anything. No tarballs, no `node_modules`, it reads what a registry says and stops there. No semver either, `pkg:npm/lodash@^4` is a package that doesn't exist, give it a real version or take the latest. Vulnerabilities? Different job.

## 🧩 Adding a registry

Want a seventh? Extend `Registry`, six methods, `register("hex", "https://hex.pm", HexRegistry)`, and `pkg:hex/phoenix` works everywhere the built-ins do. [Custom registries](https://registries.agntn.dev/guide/custom) builds the Hex one from scratch, so start there.

## 🛠️ Development

```bash
pnpm install
pnpm dev:prepare   # obuild --stub, src/ changes show up without a build
pnpm fmt           # oxlint --fix and oxfmt
pnpm lint          # builds first, then oxlint and oxfmt --check
pnpm typecheck     # library and tests, then a build and both extensions
pnpm test:run
pnpm build         # obuild
pnpm docs          # the Docus site on :3000, after pnpm build
```

## 💛 Thanks

Anthropic and OpenAI both run a program for open source, [Claude for Open Source](https://claude.com/contact-sales/claude-for-oss) and [Codex for Open Source](https://developers.openai.com/community/codex-for-oss), and this package is one of the things that came out of them <3

## 📄 License

[MIT](./LICENSE)
