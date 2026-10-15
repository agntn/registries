#!/usr/bin/env node
import { existsSync } from "node:fs";
import { sep } from "node:path";
import { fileURLToPath } from "node:url";
import { defineCommand, runMain } from "citty";
import type McpCommand from "./commands/mcp.ts";
import { version } from "./version.ts";

/** The same file from `src/cli.ts` and `dist/cli.mjs`; the npm package doesn't ship it. */
const sourceMcpCommand = new URL("../src/commands/mcp.ts", import.meta.url);
const sourceMcpCommandPath = fileURLToPath(sourceMcpCommand);

/**
 * Narrows the module a runtime URL import returned, which TypeScript types as `any`.
 * @param value - The imported module namespace.
 * @returns {value is { default: typeof McpCommand }} Whether it exports a default command.
 */
function isCommandModule(value: unknown): value is { default: typeof McpCommand } {
  return typeof value === "object" && value !== null && "default" in value;
}

/**
 * A checkout qualifies when Node strips types, outside `node_modules`, with `typebox` installed.
 * @returns {boolean} Whether the built bin can run `src/`; never under `REGISTRIES_DIST=1`.
 */
function servesSource(): boolean {
  if (
    import.meta.url.endsWith(".ts") ||
    process.env["REGISTRIES_DIST"] === "1" ||
    !process.features.typescript ||
    sourceMcpCommandPath.includes(`${sep}node_modules${sep}`) ||
    !existsSync(sourceMcpCommandPath)
  ) {
    return false;
  }
  try {
    import.meta.resolve("typebox");
    return true;
  } catch {
    return false;
  }
}

/**
 * In a checkout a change costs a restart, not a build. A runtime URL keeps `src` out of `dist`.
 * @returns {Promise<typeof McpCommand>} The citty command that starts the stdio server.
 */
async function loadMcpCommand(): Promise<typeof McpCommand> {
  if (!servesSource()) return (await import("./commands/mcp.ts")).default;
  const module: unknown = await import(sourceMcpCommand.href);
  if (!isCommandModule(module))
    throw new TypeError(`${sourceMcpCommandPath} has no default command`);
  return module.default;
}

/**
 * A reader that hangs up early (`| head -1`) ends the command, not crashes it; other errors throw.
 * @param error - The error the stream emitted.
 */
function exitOnClosedPipe(error: Readonly<NodeJS.ErrnoException>): void {
  if (error.code !== "EPIPE") throw error;
  process.exit();
}

process.stdout.on("error", exitOnClosedPipe);
process.stderr.on("error", exitOnClosedPipe);

const main = defineCommand({
  meta: {
    name: "registries",
    version,
    description:
      "Universal package registry client — query npm, PyPI, crates.io, RubyGems, Packagist with a single PURL-native API.",
  },
  subCommands: {
    info: () => import("./commands/info.ts").then((m) => m.default),
    versions: () => import("./commands/versions.ts").then((m) => m.default),
    deps: () => import("./commands/deps.ts").then((m) => m.default),
    maintainers: () => import("./commands/maintainers.ts").then((m) => m.default),
    cache: () => import("./commands/cache.ts").then((m) => m.default),
    mcp: loadMcpCommand,
  },
});

await runMain(main);
