import { fileURLToPath } from "node:url";
import { registriesTheme } from "./shiki-theme";

/** Bundled from the checkout's sources: a deploy needs neither dist/ nor the root node_modules. */
const librarySource = fileURLToPath(new URL("../src/", import.meta.url));

export default defineNuxtConfig({
  extends: ["docus"],
  /** The repo root is its own pnpm workspace; Nuxt must not treat it as this site's. */
  workspaceDir: fileURLToPath(new URL("./", import.meta.url)),
  /** The subpath alias comes first: a plain prefix match on the package name would swallow it. */
  alias: {
    "@agntn/registries/registries": `${librarySource}registries/index.ts`,
    /** The tool listings and the executor `registries mcp` serves, for the MCP server at /mcp. */
    "@agntn/registries/mcp": `${librarySource}mcp.ts`,
    "@agntn/registries": `${librarySource}index.ts`,
  },
  devtools: { enabled: true },
  telemetry: false,
  site: {
    url: "https://registries.agntn.dev",
    name: "@agntn/registries",
  },
  llms: {
    domain: "https://registries.agntn.dev",
    sections: [
      {
        title: "MCP Server",
        description: "The tools of `registries mcp` and the page tools of this site over Streamable HTTP.",
        links: [
          {
            title: "MCP endpoint",
            href: "https://registries.agntn.dev/mcp",
            description:
              "Add it to any MCP client as an HTTP server, for example `claude mcp add --transport http registries https://registries.agntn.dev/mcp`.",
          },
        ],
      },
    ],
  },
  /** Docus pages define their own OG images; the alt text is the one thing they leave unset. */
  ogImage: {
    defaults: {
      alt: "@agntn/registries: one PURL, every registry",
    },
  },
  icon: {
    clientBundle: {
      icons: [
        "lucide:arrow-down",
        "lucide:arrow-left",
        "lucide:arrow-right",
        "lucide:arrow-up",
        "lucide:arrow-up-right",
        "lucide:book-open",
        "lucide:bot",
        "lucide:check",
        "lucide:check-circle",
        "lucide:chevron-down",
        "lucide:chevron-left",
        "lucide:chevron-right",
        "lucide:chevrons-up-down",
        "lucide:circle-alert",
        "lucide:circle-x",
        "lucide:copy",
        "lucide:database",
        "lucide:expand",
        "lucide:external-link",
        "lucide:git-fork",
        "lucide:info",
        "lucide:library",
        "lucide:lightbulb",
        "lucide:link",
        "lucide:loader-circle",
        "lucide:package",
        "lucide:package-search",
        "lucide:plus",
        "lucide:search",
        "lucide:tag",
        "lucide:terminal",
        "lucide:triangle-alert",
        "lucide:users",
        "lucide:x",
        "simple-icons:anthropic",
        "simple-icons:archlinux",
        "simple-icons:composer",
        "simple-icons:cursor",
        "simple-icons:github",
        "simple-icons:markdown",
        "simple-icons:npm",
        "simple-icons:openai",
        "simple-icons:pypi",
        "simple-icons:rubygems",
        "simple-icons:rust",
        "vscode-icons:file-type-js",
        "vscode-icons:file-type-json",
        "vscode-icons:file-type-shell",
        "vscode-icons:file-type-typescript",
      ],
    },
  },
  colorMode: {
    preference: "dark",
  },
  app: {
    head: {
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/site.webmanifest" },
      ],
      meta: [
        { name: "theme-color", content: "#0b0d10" },
        { name: "apple-mobile-web-app-title", content: "registries" },
      ],
    },
  },
  nitro: {
    preset: "cloudflare_module",
    /** One MCP SDK copy, or `agents` fails the toolkit's server on its `instanceof` check. */
    alias: {
      "@modelcontextprotocol/sdk": fileURLToPath(
        new URL("./node_modules/@modelcontextprotocol/sdk/dist/esm", import.meta.url),
      ),
    },
    experimental: {
      /** An MCP tool gets no event, so the rate limit reads it through `useEvent()`. */
      asyncContext: true,
    },
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
      { name: "Figtree", provider: "local", weights: [400, 500] },
      { name: "Fira Code", provider: "local", weights: [400, 500] },
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
            default: registriesTheme,
            light: registriesTheme,
            dark: registriesTheme,
          },
        },
      },
    },
  },
});
