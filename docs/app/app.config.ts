export default defineAppConfig({
  docus: {
    colorMode: "dark",
  },
  seo: {
    title: "@agntn/registries",
    description:
      "One TypeScript interface over npm, PyPI, crates.io, RubyGems, Packagist and Arch Linux: PURL in, normalized package metadata out.",
  },
  header: {
    title: "@agntn/registries",
  },
  github: {
    url: "https://github.com/agntn/registries",
    branch: "main",
    rootDir: "docs",
  },
  socials: {
    github: "https://github.com/agntn/registries",
    npm: "https://www.npmjs.com/package/@agntn/registries",
  },
  ui: {
    colors: {
      primary: "violet",
      neutral: "slate",
    },
    button: {
      slots: {
        base: "h-9 rounded-lg px-3.5 text-sm leading-none font-medium cursor-pointer transition-colors",
      },
      compoundVariants: [
        {
          color: "primary",
          variant: "solid",
          class: "registries-primary-fill ring-0",
        },
        {
          color: "neutral",
          variant: "outline",
          class: "registries-neutral-outline ring-0",
        },
      ],
    },
    pageHeader: {
      slots: {
        root: "py-8 border-b border-muted",
        headline: "registries-eyebrow mb-3",
        title: "text-3xl sm:text-4xl font-medium tracking-tight text-highlighted",
        description: "text-base leading-7 text-muted",
      },
    },
    contentSurround: {
      slots: {
        link: "rounded-xl registries-frame border-0 bg-default hover:bg-muted",
        linkLeadingIcon: "text-muted",
      },
    },
    prose: {
      callout: {
        slots: {
          base: "rounded-xl px-4 py-3.5",
        },
      },
      card: {
        slots: {
          base: "rounded-xl registries-frame border-0 p-5 bg-default hover:bg-muted",
          icon: "size-5 mb-3 text-muted transition-colors group-hover:text-primary",
          title: "text-sm font-medium",
          description: "text-sm text-muted",
        },
      },
      cardGroup: {
        base: "grid grid-cols-1 sm:grid-cols-2 gap-3 my-5 *:my-0",
      },
      table: {
        slots: {
          root: "rounded-xl registries-frame",
        },
      },
      pre: {
        slots: {
          header: "border-default bg-default",
          base: "border-default bg-muted",
        },
      },
    },
    pageHero: {
      slots: {
        title: "font-medium tracking-tight",
        description: "text-base leading-7 sm:text-lg",
      },
    },
  },
});
