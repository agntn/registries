import type { Implementation } from "@modelcontextprotocol/sdk/types.js";
import { version } from "./version.ts";

/** How both MCP servers introduce themselves, so a connector card has more than a name on it. */
export const serverInfo = {
  name: "registries",
  version,
  description:
    "Six package registries, one answer shape. Hand it pkg:npm/lodash or pkg:cargo/serde and npm, crates.io, PyPI, RubyGems, Packagist and the AUR stop arguing about what a package looks like.",
  icons: [
    { src: "https://registries.agntn.dev/favicon.svg", mimeType: "image/svg+xml", sizes: ["any"] },
    { src: "https://registries.agntn.dev/icon-512.png", mimeType: "image/png", sizes: ["512x512"] },
  ],
} satisfies Implementation;
