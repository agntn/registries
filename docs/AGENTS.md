# docs/

Cloudflare Workers Builds deploys this site to registries.agntn.dev. It runs the install in `docs/`, and pnpm walks up to the root lockfile and fills both `node_modules`. `dist/` never exists there. Node.js comes from the root `.node-version`, never from `engines`.

The build trigger watches `docs/*` and `src/*`. A catalog bump touches only the root `pnpm-lock.yaml` and `pnpm-workspace.yaml`, so on its own it doesn't redeploy the site.

Resources on the Cloudflare account, bound by id in `wrangler.jsonc`:

- D1 `agntn-registries` as `DB` for Nuxt Content
- KV `CACHE` for the response cache
- Workers Rate Limiting as `REGISTRY_LIMIT`, namespace `3305`; the namespace id is unique per account, and agntn/urls holds `3301`, explorers `3302`, archives `3303`
- No secrets: every registry behind the site is public
