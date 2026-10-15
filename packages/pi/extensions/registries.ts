import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerPiTools } from "@agntn/tools/pi";

type ToolsModule = typeof import("../../../src/tools.ts");

/**
 * The tool definitions: checkout source, otherwise the package build. Both imports stay literal,
 * so the host resolves each one the way it resolves any other import of the extension.
 * @returns {Promise<ToolsModule>} The module with `registriesTools`.
 */
function loadTools(): Promise<ToolsModule> {
  return existsSync(fileURLToPath(new URL("../../../src/tools.ts", import.meta.url)))
    ? import("../../../src/tools.ts")
    : (import("../../../dist/tools.mjs") as Promise<ToolsModule>);
}

/**
 * Registers the registry tools; Pi validates the same schemas MCP, OMP and the AI SDK do.
 * @param pi - Pi extension API.
 */
export default async function registriesExtension(pi: ExtensionAPI): Promise<void> {
  const { registriesTools } = await loadTools();
  registerPiTools(pi, registriesTools());
}
