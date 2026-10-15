import { defineTool, Type, type ToolDefinition } from "@agntn/tools";
import {
  DEFAULT_BULK_CONCURRENCY,
  DEFAULT_VERSIONS_LIMIT,
  MAX_BULK_CONCURRENCY,
  MAX_BULK_PACKAGES,
  MAX_PURL_LENGTH,
} from "./tool-limits.ts";

/** `npm/lodash` works as well as `pkg:npm/lodash` here, as it always has on the command line. */
const purl = Type.String({
  minLength: 1,
  maxLength: MAX_PURL_LENGTH,
  description: "Package URL, the pkg: prefix optional, for example npm/lodash or cargo/serde@1.0",
});

const cache = Type.Optional(
  Type.Boolean({ description: "Read and write cached results; --no-cache asks the registry" }),
);

const lookup = Type.Object({ purl, cache }, { additionalProperties: false });

const lookupHints = { positional: ["purl"], plain: ["purl"] } as const;

const local = { effect: "write" } as const;
const remote = { effect: "read", openWorld: true } as const;

/**
 * Commands only the CLI gets, in place of the generated ones: shorthand PURLs, cache, text.
 *
 * @returns {readonly ToolDefinition[]} The four lookups, `bulk` and `cache`.
 */
export function registriesCommands(): readonly ToolDefinition[] {
  return [
    defineTool({
      name: "registries_info",
      title: "Show Package",
      description: "Show package metadata.",
      ...remote,
      input: lookup,
      cli: { command: "info", ...lookupHints },
      execute: async (args) => (await import("./commands/info.ts")).info(args),
    }),
    defineTool({
      name: "registries_versions",
      title: "List Package Versions",
      description: "List package versions, newest first.",
      ...remote,
      input: Type.Object(
        {
          purl,
          cache,
          limit: Type.Optional(
            Type.Union([Type.Integer({ minimum: 1 }), Type.Enum(["all"])], {
              description: `How many versions to show, ${DEFAULT_VERSIONS_LIMIT} when absent, or all`,
            }),
          ),
        },
        { additionalProperties: false },
      ),
      cli: { command: "versions", short: { limit: "l" }, ...lookupHints },
      execute: async (args) => (await import("./commands/versions.ts")).versions(args),
    }),
    defineTool({
      name: "registries_deps",
      title: "List Package Dependencies",
      description: "List package dependencies, for the latest release when the PURL names none.",
      ...remote,
      input: lookup,
      cli: { command: "deps", aliases: ["dependencies"], ...lookupHints },
      execute: async (args) => (await import("./commands/deps.ts")).deps(args),
    }),
    defineTool({
      name: "registries_maintainers",
      title: "List Package Maintainers",
      description: "List package maintainers.",
      ...remote,
      input: lookup,
      cli: { command: "maintainers", ...lookupHints },
      execute: async (args) => (await import("./commands/maintainers.ts")).maintainers(args),
    }),
    defineTool({
      name: "registries_bulk",
      title: "Get Packages in Bulk",
      description: `Fetch up to ${MAX_BULK_PACKAGES} packages at once. A package that fails is left out.`,
      ...remote,
      input: Type.Object(
        {
          purls: Type.Array(purl, {
            minItems: 1,
            maxItems: MAX_BULK_PACKAGES,
            description: "Package URLs, the pkg: prefix optional",
          }),
          concurrency: Type.Optional(
            Type.Integer({
              minimum: 1,
              maximum: MAX_BULK_CONCURRENCY,
              description: `How many lookups run at once, ${DEFAULT_BULK_CONCURRENCY} when absent`,
            }),
          ),
        },
        { additionalProperties: false },
      ),
      cli: { command: "bulk", rest: "purls", plain: ["purls"] },
      execute: async (args) => (await import("./commands/bulk.ts")).bulk(args),
    }),
    defineTool({
      name: "registries_cache",
      title: "Manage Cache",
      description: "Manage the registries cache: clear, path, status or prune.",
      ...local,
      input: Type.Object(
        {
          action: Type.Enum(["clear", "path", "status", "prune"], {
            description:
              "clear empties it, path prints where it lives, status counts it, prune drops what went stale",
          }),
        },
        { additionalProperties: false },
      ),
      cli: { command: "cache", positional: ["action"] },
      execute: async (args) => (await import("./commands/cache.ts")).cache(args),
    }),
  ];
}
