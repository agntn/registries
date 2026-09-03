import { fileURLToPath } from "node:url";

export default defineNuxtConfig({
  extends: ["docus"],
  /** The repo root is its own pnpm workspace; Nuxt must not treat it as this site's. */
  workspaceDir: fileURLToPath(new URL("./", import.meta.url)),
  devtools: { enabled: true },
  telemetry: false,
  site: {
    url: "https://registries.agntn.dev",
    name: "@agntn/registries",
  },
  llms: {
    domain: "https://registries.agntn.dev",
  },
  icon: {
    clientBundle: {
      icons: [
        "lucide:arrow-right",
        "lucide:arrow-up-right",
        "lucide:book-open",
        "lucide:bot",
        "lucide:box",
        "lucide:boxes",
        "lucide:check",
        "lucide:chevron-left",
        "lucide:chevron-right",
        "lucide:copy",
        "lucide:database",
        "lucide:external-link",
        "lucide:git-fork",
        "lucide:hash",
        "lucide:layers",
        "lucide:library",
        "lucide:link",
        "lucide:loader-circle",
        "lucide:package",
        "lucide:package-search",
        "lucide:plus",
        "lucide:search",
        "lucide:shield-alert",
        "lucide:tag",
        "lucide:terminal",
        "lucide:users",
        "lucide:x",
        "simple-icons:archlinux",
        "simple-icons:composer",
        "simple-icons:github",
        "simple-icons:npm",
        "simple-icons:pypi",
        "simple-icons:rubygems",
        "simple-icons:rust",
        "vscode-icons:file-type-js",
        "vscode-icons:file-type-typescript",
        "vscode-icons:file-type-json",
        "vscode-icons:file-type-shell",
      ],
    },
  },
  colorMode: {
    preference: "dark",
  },
  /** Docus ships an MCP endpoint that needs the Cloudflare Agents SDK on Workers. The docs do not need it. */
  mcp: {
    enabled: false,
  },
  nitro: {
    preset: "cloudflare_module",
    compatibilityDate: "2026-09-03",
    prerender: {
      crawlLinks: true,
      routes: ["/", "/sitemap.xml", "/robots.txt", "/llms.txt", "/llms-full.txt"],
      ignore: ["/api"],
    },
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
  },
  compatibilityDate: "2026-09-03",
  /** In production the response cache lives in KV, so it survives isolates. */
  $production: {
    nitro: {
      storage: {
        cache: {
          driver: "cloudflare-kv-binding",
          binding: "CACHE",
        },
      },
    },
  },
  /** Fonts live in public/fonts and app/assets/fonts.css, which is the only place nuxt-og-image reads them from. */
  css: ["~/assets/fonts.css"],
  fonts: {
    families: [
      { name: "Space Grotesk", provider: "local", weights: [400, 500, 600] },
      { name: "Space Mono", provider: "local", weights: [400, 700] },
    ],
  },
  content: {
    database: {
      type: "d1",
      bindingName: "DB",
    },
    build: {
      markdown: {
        highlight: {
          theme: {
            default: "github-light",
            light: "github-light",
            dark: "poimandres",
          },
        },
      },
    },
  },
});
