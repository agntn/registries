#!/usr/bin/env node
import { existsSync } from "node:fs";
import { sep } from "node:path";
import { fileURLToPath } from "node:url";
import type * as McpCommand from "./commands/mcp.ts";

/** The same file from `src/cli.ts` and `dist/cli.mjs`; the npm package doesn't ship it. */
const sourceMcpCommand = new URL("../src/commands/mcp.ts", import.meta.url);
const sourceMcpCommandPath = fileURLToPath(sourceMcpCommand);

/**
 * Narrows the module a runtime URL import returned, which TypeScript types as `any`.
 * @param value - The imported module namespace.
 * @returns {value is typeof McpCommand} Whether it exports `serveMcp`.
 */
function isMcpModule(value: unknown): value is typeof McpCommand {
  return typeof value === "object" && value !== null && "serveMcp" in value;
}

/**
 * A checkout qualifies when Node strips types and the package sits outside `node_modules`.
 * @returns {boolean} Whether the built bin can run `src/`; never under `REGISTRIES_DIST=1`.
 */
function servesSource(): boolean {
  return (
    !import.meta.url.endsWith(".ts") &&
    process.env["REGISTRIES_DIST"] !== "1" &&
    process.features.typescript &&
    !sourceMcpCommandPath.includes(`${sep}node_modules${sep}`) &&
    existsSync(sourceMcpCommandPath)
  );
}

/**
 * In a checkout a change costs a restart, not a build. A runtime URL keeps `src` out of `dist`.
 * @returns {Promise<typeof McpCommand>} The module that starts the stdio server.
 */
async function loadMcpCommand(): Promise<typeof McpCommand> {
  if (!servesSource()) return import("./commands/mcp.ts");
  const module: unknown = await import(sourceMcpCommand.href);
  if (!isMcpModule(module)) throw new TypeError(`${sourceMcpCommandPath} has no serveMcp`);
  return module;
}

const argv = process.argv.slice(2);

/** `registries mcp` serves straight away, and a stray flag from a client config doesn't stop it. */
const servesMcp = argv[0] === "mcp" && !argv.some((word) => word === "--help" || word === "-h");

if (servesMcp) {
  await (await loadMcpCommand()).serveMcp();
} else {
  await (await import("./cli-run.ts")).runRegistriesCli(argv);
}
