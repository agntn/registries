# Contributing

## Setup

`pnpm install`, then the same three checks CI runs: `pnpm lint`, `pnpm typecheck`, `pnpm test:run`. Lint and typecheck build first, so don't be surprised when `dist/` shows up.

Running `registries mcp` from this checkout? It serves `src/`, so an edit needs a restart and nothing more. `src/cli.ts` is the exception. Change it and you want `pnpm build`.

## What belongs here

- It reads what a registry says and stops there. No installs, no tarballs, no semver ranges, no vulnerability data.
- The cache is a decorator you opt into. Every lookup works without it, and that stays first class.
- A bulk lookup skips the packages that fail. That's on purpose, one dead PURL shouldn't sink fifty good ones.

## Adding a registry

1. `src/registries/<name>.ts` with a class extending `Registry`. `npm.ts` is the most complete one to copy from.
2. An entry in `builtins` in `src/registries/index.ts`, with a literal `import()` as its loader. `build.config.ts` picks the file up from the directory by itself.
3. The adapter turns the upstream payload into `Package`, `Version`, `Dependency` and `Maintainer` before it returns. The raw response never leaves the file.
4. Remote failures become the errors from `src/core/errors.ts`: `NotFoundError`, `RateLimitError`, `HTTPError`. Never a plain `Error`.
5. A page in `docs/content/2.registries/` and a row in `ECOSYSTEMS` in `docs/app/utils/registries.ts`. The site's roster, sidebar and lookup form all read that row.

## Code

- `commands/`, `registries/` and `cache/` depend on `core/`, never the other way. The one exception is `create()` reading the manifest, which imports no adapter until it's asked for one.
- Adapters don't import each other.
- Nothing runs at import. No `register()` at module scope, no `process.env` read up there. `sideEffects: false` is a promise about every module, and `test/unit/lazy-loading.test.ts` checks that `create()` loads only the adapter it needs.
- Every request goes through `Client` in `src/core/client.ts`. Retry and backoff constants live there and nowhere else, and the cache TTLs live in `src/cache/lockfile.ts`.
- PURLs are parsed in `src/core/purl.ts` only. Everything else calls `parsePURL` or `createFromPURL`.
- No `as any`, no `@ts-ignore`, no `@ts-expect-error`. The lint flags `@ts-ignore` and any `any` that flows somewhere. `@ts-expect-error` slips past it, so that one's on you.
- Keep the cache key format stable, old lockfiles depend on it.

## Agent tools and the CLI

- One `defineTool` per tool in `src/tools.ts`, its executor in `src/tool-operations.ts`. MCP, Pi, OMP, the AI SDK, the CLI and the site's `/mcp` all get that one list, so a fix never lands on one surface only.
- Schemas take `Type` from `@agntn/tools`. A bare `typebox` import gets swapped by OMP for a facade that validates nothing, and `test/unit/build-config.test.ts` won't let it through.
- Every tool is read only, `effect: "read"`.
- A command only the CLI has is a `defineTool` in `src/cli-commands.ts`, with its code in `src/commands/` imported inside `execute`. Import it at the top and `registries --help` loads every command for nothing.
- A lookup returns its text as the result and its data as `details`, which `--json` prints. A failure the library types goes through `answer()` in `src/commands/shared.ts`. No colors in the text.

## Tests

`test/unit/` is deterministic, mocks and spies only. `test/e2e/` hits the real registries, so a red run there can just be a bad minute on PyPI.

## Docs site

`pnpm docs` serves it on port 3000.

- Registry metadata is untrusted. Descriptions, keywords and maintainers render as text, never `v-html`.
- Counts on the site come from `ECOSYSTEMS` or from the library. Nobody types a number into copy.
- Every `server/api` route goes through `cachedAnswer` in `server/utils/query.ts`. The registries behind it are public services, be nice to them.
- The explorer mirrors the response shapes as local interfaces. The route files own them.
- Workers Builds installs `docs/` alone. A new npm import that `src/index.ts` or `src/tools.ts` can reach needs an entry in `docs/package.json`, or the deploy breaks while everything builds fine locally.
- CI installs the root only, so no test loads the worker. Prove a `/mcp` change with a probe on `nuxt dev` or `wrangler dev`.
- The landing's SEO description ends without a period, or its OG image quietly skips the prerender. `test/unit/docs-og.test.ts` checks it.
