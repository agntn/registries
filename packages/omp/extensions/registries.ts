import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { AgentToolResult, ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

import type * as RegistryTools from "../../../dist/tool-operations.d.mts";

const sourceModulePath = fileURLToPath(new URL("../../../src/tool-operations.ts", import.meta.url));
let toolOperationsPromise: Promise<typeof RegistryTools> | undefined;

function loadToolOperations(): Promise<typeof RegistryTools> {
  toolOperationsPromise ??= (
    existsSync(sourceModulePath)
      ? import("../../../src/tool-operations.ts")
      : import("../../../dist/tool-operations.mjs")
  ) as Promise<typeof RegistryTools>;
  return toolOperationsPromise;
}

type RegistryToolResult = AgentToolResult<unknown>;

export default function registriesExtension(pi: ExtensionAPI): void {
  const { Type } = pi.typebox;
  const PURL = Type.String({
    minLength: 1,
    maxLength: 2_048,
    description: "Package URL, for example pkg:npm/lodash or pkg:pypi/requests@2.32.3",
  });
  const PURLParams = Type.Object({ purl: PURL }, { additionalProperties: false });
  const BulkPackagesParams = Type.Object(
    {
      purls: Type.Array(PURL, { minItems: 1, maxItems: 50 }),
      concurrency: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
    },
    { additionalProperties: false },
  );
  const EmptyParams = Type.Object({}, { additionalProperties: false });

  pi.setLabel("Registries");

  pi.registerTool({
    name: "registries_package",
    label: "Registry Package",
    description: "Fetch normalized metadata for one package URL",
    parameters: PURLParams,
    approval: "read",
    async execute(_toolCallId, params, signal): Promise<RegistryToolResult> {
      const { packageOperation } = await loadToolOperations();
      return packageOperation(params, signal);
    },
  });

  pi.registerTool({
    name: "registries_versions",
    label: "Registry Versions",
    description: "List normalized versions for one package URL",
    parameters: PURLParams,
    approval: "read",
    async execute(_toolCallId, params, signal): Promise<RegistryToolResult> {
      const { versionsOperation } = await loadToolOperations();
      return versionsOperation(params, signal);
    },
  });

  pi.registerTool({
    name: "registries_dependencies",
    label: "Registry Dependencies",
    description: "List dependencies for a versioned package URL",
    parameters: PURLParams,
    approval: "read",
    async execute(_toolCallId, params, signal): Promise<RegistryToolResult> {
      const { dependenciesOperation } = await loadToolOperations();
      return dependenciesOperation(params, signal);
    },
  });

  pi.registerTool({
    name: "registries_maintainers",
    label: "Registry Maintainers",
    description: "List normalized maintainers for one package URL",
    parameters: PURLParams,
    approval: "read",
    async execute(_toolCallId, params, signal): Promise<RegistryToolResult> {
      const { maintainersOperation } = await loadToolOperations();
      return maintainersOperation(params, signal);
    },
  });

  pi.registerTool({
    name: "registries_bulk_packages",
    label: "Registry Bulk Packages",
    description: "Fetch normalized metadata for up to 50 package URLs",
    parameters: BulkPackagesParams,
    approval: "read",
    async execute(_toolCallId, params, signal): Promise<RegistryToolResult> {
      const { bulkPackagesOperation } = await loadToolOperations();
      return bulkPackagesOperation(params, signal);
    },
  });

  pi.registerTool({
    name: "registries_ecosystems",
    label: "Registry Ecosystems",
    description: "List package ecosystems registered by this package",
    parameters: EmptyParams,
    approval: "read",
    async execute(): Promise<RegistryToolResult> {
      const { ecosystemsOperation } = await loadToolOperations();
      return ecosystemsOperation();
    },
  });
}
