import { defineTool, Type } from "@agntn/tools";
import type { Client } from "./core/client.ts";
import {
  DEFAULT_BULK_CONCURRENCY,
  DEFAULT_VERSIONS_LIMIT,
  MAX_BULK_CONCURRENCY,
  MAX_BULK_PACKAGES,
  MAX_PURL_LENGTH,
} from "./tool-limits.ts";

type Operations = typeof import("./tool-operations.ts");

let operations: Promise<Operations> | undefined;

/**
 * The executors and the registry graph load on the first call, so registering a tool loads neither.
 * @returns {Promise<Operations>} The cached executor module.
 */
function loadOperations(): Promise<Operations> {
  operations ??= import("./tool-operations.ts");
  return operations;
}

/** How the tools reach the registries. */
export interface RegistriesToolOptions {
  /** HTTP client for every registry request, the default one when absent. */
  readonly client?: Client;
}

const PURL = Type.String({
  minLength: 1,
  maxLength: MAX_PURL_LENGTH,
  description: "Package URL, for example pkg:npm/lodash or pkg:pypi/requests@2.32.3",
});

const PURLParams = Type.Object({ purl: PURL }, { additionalProperties: false });

const VersionsParams = Type.Object(
  {
    purl: PURL,
    limit: Type.Optional(
      Type.Union([Type.Integer({ minimum: 1 }), Type.Enum(["all"])], {
        description: `How many of the newest versions to return, ${DEFAULT_VERSIONS_LIMIT} when absent. Pass "all" for the whole release history.`,
      }),
    ),
  },
  { additionalProperties: false },
);

const BulkPackagesParams = Type.Object(
  {
    purls: Type.Array(PURL, { minItems: 1, maxItems: MAX_BULK_PACKAGES }),
    concurrency: Type.Optional(
      Type.Integer({
        minimum: 1,
        maximum: MAX_BULK_CONCURRENCY,
        description: `How many lookups run at once, ${DEFAULT_BULK_CONCURRENCY} when absent.`,
      }),
    ),
  },
  { additionalProperties: false },
);

/** Every remote lookup reads, and asks a registry whose answer can change between two calls. */
const remote = { effect: "read", idempotent: false, openWorld: true } as const;

/**
 * The registry tools every surface gets: MCP, Pi, OMP, the AI SDK and the CLI.
 *
 * @param options - The HTTP client, for a host that brings its own, such as the docs worker.
 * @returns {ToolDefinition[]} The six tools, from one package to the ecosystem list.
 */
export function registriesTools(options: RegistriesToolOptions = {}) {
  const { client } = options;
  return [
    defineTool({
      name: "registries_package",
      title: "Get Package Metadata",
      description: "Fetch normalized metadata for one package URL.",
      snippet: "Use registries_package to inspect normalized package metadata.",
      guidelines: [
        "Use registries_package with a PURL such as pkg:npm/lodash or pkg:pypi/requests.",
      ],
      ...remote,
      input: PURLParams,
      cli: { command: "info", positional: ["purl"], plain: ["purl"] },
      execute: async (args, { signal }) =>
        (await loadOperations()).packageOperation(args, signal, client),
    }),
    defineTool({
      name: "registries_versions",
      title: "List Package Versions",
      description: `List versions for one package URL, newest first with undated ones last. Returns the ${DEFAULT_VERSIONS_LIMIT} newest unless limit asks for more or "all"; omitted counts the ones left out.`,
      snippet: "Use registries_versions to inspect package releases.",
      guidelines: [
        "Use registries_versions when release dates, integrity, or status matter.",
        `Pass limit "all" to registries_versions only when the whole release history matters; the ${DEFAULT_VERSIONS_LIMIT} newest cover most questions.`,
      ],
      ...remote,
      input: VersionsParams,
      cli: { positional: ["purl"], plain: ["purl"] },
      execute: async (args, { signal }) =>
        (await loadOperations()).versionsOperation(args, signal, client),
    }),
    defineTool({
      name: "registries_dependencies",
      title: "List Package Dependencies",
      description: "List dependencies for a versioned package URL.",
      snippet: "Use registries_dependencies to inspect one package release.",
      guidelines: [
        "Use registries_dependencies with a versioned PURL such as pkg:npm/lodash@4.17.21.",
      ],
      ...remote,
      input: PURLParams,
      cli: { command: "deps", positional: ["purl"], plain: ["purl"] },
      execute: async (args, { signal }) =>
        (await loadOperations()).dependenciesOperation(args, signal, client),
    }),
    defineTool({
      name: "registries_maintainers",
      title: "List Package Maintainers",
      description: "List normalized maintainers for one package URL.",
      snippet: "Use registries_maintainers to inspect package ownership.",
      guidelines: [
        "Use registries_maintainers to retrieve the identities published by the package registry.",
      ],
      ...remote,
      input: PURLParams,
      cli: { positional: ["purl"], plain: ["purl"] },
      execute: async (args, { signal }) =>
        (await loadOperations()).maintainersOperation(args, signal, client),
    }),
    defineTool({
      name: "registries_bulk_packages",
      title: "Get Packages in Bulk",
      description: `Fetch normalized metadata for up to ${MAX_BULK_PACKAGES} package URLs. A package that fails is left out of the answer.`,
      snippet: "Use registries_bulk_packages to inspect several packages concurrently.",
      guidelines: [
        "Use registries_bulk_packages for independent package lookups; failed packages are absent from the result.",
      ],
      ...remote,
      input: BulkPackagesParams,
      cli: { command: "bulk", rest: "purls", plain: ["purls"] },
      execute: async (args, { signal }) =>
        (await loadOperations()).bulkPackagesOperation(args, signal, client),
    }),
    defineTool({
      name: "registries_ecosystems",
      title: "List Ecosystems",
      description: "List package ecosystems registered by this package.",
      snippet: "Use registries_ecosystems to discover supported package URL types.",
      guidelines: [
        "Use registries_ecosystems before choosing a PURL type when ecosystem support is uncertain.",
      ],
      effect: "read",
      input: Type.Object({}),
      execute: async () => (await loadOperations()).ecosystemsOperation(),
    }),
  ] as const;
}
