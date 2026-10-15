import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { registerOmpTools } from "@agntn/tools/omp";

type ToolsModule = typeof import("../../../src/tools.ts");

/**
 * The tool definitions: checkout source, otherwise the package build. Both imports stay literal,
 * because OMP resolves the bare imports of a module only when it can see the specifier.
 * @returns {Promise<ToolsModule>} The module with `registriesTools`.
 */
function loadTools(): Promise<ToolsModule> {
  return existsSync(fileURLToPath(new URL("../../../src/tools.ts", import.meta.url)))
    ? import("../../../src/tools.ts")
    : (import("../../../dist/tools.mjs") as Promise<ToolsModule>);
}

/**
 * Registers the registry tools; OMP validates the same schemas MCP, Pi and the AI SDK do.
 * @param pi - OMP extension API.
 */
export default async function registriesExtension(pi: ExtensionAPI): Promise<void> {
  const { registriesTools } = await loadTools();
  pi.setLabel("Registries");
  registerOmpTools(pi, registriesTools(), { Text: pi.pi.Text });
}
