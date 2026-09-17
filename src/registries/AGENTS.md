# REGISTRIES GUIDE

## OVERVIEW

`src/registries` contains ecosystem adapters implementing a common `Registry` contract and normalizing foreign API payloads into shared core types.

## STRUCTURE

```text
src/registries/
|- index.ts       # builtins manifest: key, default URL, lazy import() per adapter
|- npm.ts         # npm adapter
|- pypi.ts        # PyPI adapter
|- cargo.ts       # crates.io adapter
|- rubygems.ts    # RubyGems adapter
|- packagist.ts   # Packagist adapter
`- alpm.ts        # Arch Linux adapter (official repos + AUR)
```

## WHERE TO LOOK

| Task                    | Location                      | Notes                                          |
| ----------------------- | ----------------------------- | ---------------------------------------------- |
| List all ecosystems     | `src/registries/index.ts`     | Manifest read by `create()`; no adapter import |
| npm adapter behavior    | `src/registries/npm.ts`       | Largest implementation; good pattern baseline  |
| Python package behavior | `src/registries/pypi.ts`      | Name normalization and metadata mapping        |
| Cargo crate behavior    | `src/registries/cargo.ts`     | crates.io-specific dependency mapping          |
| RubyGems behavior       | `src/registries/rubygems.ts`  | Maintainer/license mapping nuances             |
| Packagist behavior      | `src/registries/packagist.ts` | Composer ecosystem parsing                     |

## CONVENTIONS

- Each adapter exposes `ecosystem`, `fetchPackage`, `fetchVersions`, `fetchDependencies`, `fetchMaintainers`, `urls`.
- Convert source-specific fields into core `Package`/`Version`/`Dependency`/`Maintainer` shapes.
- Map remote API failures to core error classes.
- Keep adapter internals self-contained; no adapter-to-adapter imports.

## ANTI-PATTERNS

- Do not call `fetch` directly; use `Client`.
- Do not return raw upstream payloads through public methods.
- Do not call `register()` at module scope; a new adapter gets a manifest entry in `index.ts` and the build picks its file up from the directory.

## NOTES

- `npm.ts` is the largest adapter and a reliable local reference for new adapter patterns.
- Keep per-registry quirks isolated to that file; normalize before returning shared types.
