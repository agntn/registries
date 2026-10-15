# docs/

Cloudflare Workers Builds deploys this site to registries.agntn.dev. It installs `docs/` alone, so the root `node_modules` and `dist/` never exist there, and it takes Node.js from the root `.node-version`, never from `engines`.

Resources on the Cloudflare account, bound by id in `wrangler.jsonc`:

- D1 `agntn-registries` as `DB` for Nuxt Content
- KV `CACHE` for the response cache
- Workers Rate Limiting as `REGISTRY_LIMIT`, namespace `3305`; the namespace id is unique per account, and agntn/urls holds `3301`, explorers `3302`, archives `3303`
- No secrets: every registry behind the site is public
