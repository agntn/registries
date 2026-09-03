# docs/

Docus site for `@agntn/registries`. Markdown lives in `content/`. The lookup explorer is a Vue page in the Nuxt app backed by Nitro routes over the library, not a script.

## Layout

```
docs/
├── nuxt.config.ts                 # extends: ['docus'], cloudflare_module preset (Workers)
├── app/app.config.ts              # title, github, theme
├── app/app.css                    # theme tokens (light + .dark), shared `registries-*` classes
├── app/components/                # Docus overrides: AppHeaderLogo, AppHeaderCTA (nav), AppFooterLeft, DocsAsideLeftBody
├── app/components/content/        # MDC components (`::landing-home`, `::registry-facts`, `::lookup-explorer`)
├── app/components/OgImage/        # Docs.takumi and Landing.takumi override the Docus OG templates
├── app/assets/fonts.css           # @font-face for the TTFs served from public/fonts (site and OG images)
├── app/composables/               # useLandingLookup (one clock for every live panel), useSubNavigation
├── app/utils/                     # ecosystems table, formatting, recorded landing samples
├── app/pages/lookup.vue           # explorer, own route outside the docs layout
├── server/api/                    # package, versions, dependencies, maintainers, ecosystems over the library
├── server/utils/query.ts          # parameter caps, cache, rate limit, error mapping
├── content/index.md               # landing
├── content/1.guide/               # getting started, purl, lookups, cache, cli, agents, custom, explorer
└── content/2.registries/          # one page per ecosystem
```

## Commands

```bash
pnpm install          # from docs/, after pnpm build in the repo root
pnpm dev              # http://localhost:3000
pnpm build            # Cloudflare Workers output in .output/, content routes prerendered
pnpm deploy           # build, then wrangler deploy to registries.agntn.dev
pnpm generate         # static output only; the /api routes need the worker
```

Deployment: Nitro preset `cloudflare_module`. Nuxt Content needs a D1 binding named `DB` and the response cache a KV binding named `CACHE`; `wrangler.jsonc` carries both and the `NUXT_SITE_URL` var, Nitro merges it into the generated `.output/server/wrangler.json`. Create them once with `wrangler d1 create agntn-registries` and `wrangler kv namespace create CACHE` and put the ids in `wrangler.jsonc`; the ids there are placeholders until then.

The site imports `@agntn/registries` from `file:..`. Build the parent package first.

Resolution traps, both caused by the repo root being a pnpm workspace:

- `pnpm-workspace.yaml` sets `shamefullyHoist: true`. Without it `docs/node_modules` holds only direct dependencies, Node walks up to the root `node_modules`, and the server bundle can get a second copy of Vue.
- `nuxt.config.ts` pins `workspaceDir` to `docs/` and disables telemetry, which would otherwise be resolved from the root.

## Live data

- `server/api/*.get.ts` resolve the PURL with `createFromPURL` and call `fetchPackage`, `fetchVersions`, `fetchDependencies` and `fetchMaintainers` on the adapter, with a `Client` of one retry and a twenty second timeout. The page shows what a script would get.
- Every route goes through `cachedAnswer` in `server/utils/query.ts`: exact parameters as the key, the library's `DEFAULT_TTL` for the data type, nothing for a thrown failure. Do not bypass it: the registries behind it are public services. A cache miss also counts against `RATE_LIMIT` (30 new queries a minute per address, 429 past it); cache hits are free.
- Library errors are mapped in `toHttpError`: `NotFoundError` 404, `InvalidPURLError` and `UnknownEcosystemError` 400, `RateLimitError` 429, `HTTPError` 502.
- `app/utils/landing-fixtures.ts` holds answers recorded through the library so the landing paints before the worker answers. Regenerate it with a script over `dist/index.mjs` (`createFromPURL` plus the four lookups for the six example PURLs); never edit the recorded values by hand.
- In production the cache lives in the KV binding `CACHE` (`$production.nitro.storage.cache`); locally it is in memory.
- The explorer applies its deep link through a `watch(route.query)` that fires once: a prerendered page hydrates with an empty query and Nuxt restores the address after mount.

## OG images

- `app/components/OgImage/Docs.takumi.vue` and `Landing.takumi.vue` override the Docus templates of the same name and are rendered by Takumi at build time. Takumi has no CSS variables, so the theme colours from `app.css` are repeated there as literals.
- nuxt-og-image does not see the faces `@nuxt/fonts` generates on this Nuxt version, but it parses `@font-face` rules from the files in `css`. That is why `app/assets/fonts.css` declares the five TTFs in `public/fonts` and `fonts.families` uses the `local` provider: the site and the OG images share the same files.
- The landing OG file is named from the SEO description. Nitro refuses to write a prerender path containing `..`, so a description ending in a period (`out..png`) is silently skipped and the landing ships with a dead `og:image`. Keep the description in `content/index.md` free of a trailing period.

## Constraints

- Registry metadata is untrusted data. Render descriptions, keywords and maintainer fields as text; never `v-html`.
- Ecosystem names, icons, class names and example PURLs live once in `app/utils/registries.ts`. The sidebar, the landing grid, the explorer and `::registry-facts` read from it.
- Keep the docs API shapes (`PackageAnswer` and friends) in the route files; the explorer mirrors them as local interfaces.
