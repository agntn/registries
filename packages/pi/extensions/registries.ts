import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { AgentToolResult, ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type * as RegistryTools from "../../../dist/tool-operations.d.mts";

const sourceModuleUrl = new URL("../../../src/tool-operations.ts", import.meta.url);
const distributionModuleUrl = new URL("../../../dist/tool-operations.mjs", import.meta.url);
let toolOperationsPromise: Promise<typeof RegistryTools> | undefined;

function loadToolOperations(): Promise<typeof RegistryTools> {
  toolOperationsPromise ??= import(
    existsSync(fileURLToPath(sourceModuleUrl)) ? sourceModuleUrl.href : distributionModuleUrl.href
  ) as Promise<typeof RegistryTools>;
  return toolOperationsPromise;
}

const PURL = Type.String({
  minLength: 1,
  maxLength: 2_048,
  description: "Package URL, for example pkg:npm/lodash or pkg:pypi/requests@2.32.3",
});
const PURLParams = Type.Object({ purl: PURL }, { additionalProperties: false });
const VersionsParams = Type.Object(
  {
    purl: PURL,
    limit: Type.Optional(
      Type.Union([Type.Integer({ minimum: 1 }), Type.Literal("all")], {
        description:
          'How many of the newest versions to return, 20 when absent. Pass "all" for the whole release history.',
      }),
    ),
  },
  { additionalProperties: false },
);
const BulkPackagesParams = Type.Object(
  {
    purls: Type.Array(PURL, { minItems: 1, maxItems: 50 }),
    concurrency: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
  },
  { additionalProperties: false },
);
const EmptyParams = Type.Object({}, { additionalProperties: false });

type RegistryToolResult = AgentToolResult<unknown>;

export default function registriesExtension(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "registries_package",
    label: "Registry Package",
    description: "Fetch normalized metadata for one package URL",
    promptSnippet: "Use registries_package to inspect normalized package metadata.",
    promptGuidelines: [
      "Use registries_package with a PURL such as pkg:npm/lodash or pkg:pypi/requests.",
    ],
    parameters: PURLParams,
    async execute(_toolCallId, params, signal): Promise<RegistryToolResult> {
      const { packageOperation } = await loadToolOperations();
      return packageOperation(params, signal);
    },
  });

  pi.registerTool({
    name: "registries_versions",
    label: "Registry Versions",
    description:
      'List versions for one package URL, newest first with undated ones last. Returns the 20 newest unless limit asks for more or "all"; omitted counts the ones left out.',
    promptSnippet: "Use registries_versions to inspect package releases.",
    promptGuidelines: [
      "Use registries_versions when release dates, integrity, or status matter.",
      'Pass limit "all" to registries_versions only when the whole release history matters; the 20 newest cover most questions.',
    ],
    parameters: VersionsParams,
    async execute(_toolCallId, params, signal): Promise<RegistryToolResult> {
      const { versionsOperation } = await loadToolOperations();
      return versionsOperation(params, signal);
    },
  });

  pi.registerTool({
    name: "registries_dependencies",
    label: "Registry Dependencies",
    description: "List dependencies for a versioned package URL",
    promptSnippet: "Use registries_dependencies to inspect one package release.",
    promptGuidelines: [
      "Use registries_dependencies with a versioned PURL such as pkg:npm/lodash@4.17.21.",
    ],
    parameters: PURLParams,
    async execute(_toolCallId, params, signal): Promise<RegistryToolResult> {
      const { dependenciesOperation } = await loadToolOperations();
      return dependenciesOperation(params, signal);
    },
  });

  pi.registerTool({
    name: "registries_maintainers",
    label: "Registry Maintainers",
    description: "List normalized maintainers for one package URL",
    promptSnippet: "Use registries_maintainers to inspect package ownership.",
    promptGuidelines: [
      "Use registries_maintainers to retrieve the identities published by the package registry.",
    ],
    parameters: PURLParams,
    async execute(_toolCallId, params, signal): Promise<RegistryToolResult> {
      const { maintainersOperation } = await loadToolOperations();
      return maintainersOperation(params, signal);
    },
  });

  pi.registerTool({
    name: "registries_bulk_packages",
    label: "Registry Bulk Packages",
    description: "Fetch normalized metadata for up to 50 package URLs",
    promptSnippet: "Use registries_bulk_packages to inspect several packages concurrently.",
    promptGuidelines: [
      "Use registries_bulk_packages for independent package lookups; failed packages are absent from the result.",
    ],
    parameters: BulkPackagesParams,
    async execute(_toolCallId, params, signal): Promise<RegistryToolResult> {
      const { bulkPackagesOperation } = await loadToolOperations();
      return bulkPackagesOperation(params, signal);
    },
  });

  pi.registerTool({
    name: "registries_ecosystems",
    label: "Registry Ecosystems",
    description: "List package ecosystems registered by this package",
    promptSnippet: "Use registries_ecosystems to discover supported package URL types.",
    promptGuidelines: [
      "Use registries_ecosystems before choosing a PURL type when ecosystem support is uncertain.",
    ],
    parameters: EmptyParams,
    async execute(): Promise<RegistryToolResult> {
      const { ecosystemsOperation } = await loadToolOperations();
      return ecosystemsOperation();
    },
  });
}
