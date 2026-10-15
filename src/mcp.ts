import { callTool, createMcpServer as createToolServer, errorResult } from "@agntn/tools/mcp";
import type { Server } from "@modelcontextprotocol/server";
import { serverInfo } from "./server-info.ts";
import { registriesTools } from "./tools.ts";

const RESTART = "src/ changed under this server, restart it to load the new code";

/**
 * Cached modules plus adapters imported after a pull make a mix nobody wrote. The bundle can't.
 * Measured from the process start, so a pull that lands while `src/` is still loading counts too.
 * @returns {Promise<() => boolean>} Whether `src/` changed since this server started.
 */
async function watchSource(): Promise<() => boolean> {
  const { sourceChangeCheck } = await import("./source-change.ts");
  return sourceChangeCheck(import.meta.dirname, performance.timeOrigin);
}

/**
 * The stdio server with the six tools Pi, OMP, the AI SDK and the CLI get. Run from `src/`, it
 * refuses calls once that tree changes, checked before the tool name and after the answer.
 * @returns {Server} Unconnected MCP server.
 */
export function createMcpServer(): Server {
  const tools = registriesTools();
  const server = createToolServer(serverInfo, tools);
  if (!import.meta.url.endsWith(".ts")) return server;

  const watching = watchSource();
  server.setRequestHandler("tools/call", async (request, ctx) => {
    const changed = await watching;
    if (changed()) return errorResult(RESTART);
    const { name, arguments: args = {} } = request.params;
    const result = await callTool(serverInfo, tools, name, args, { signal: ctx.mcpReq.signal });
    return changed() ? errorResult(RESTART) : result;
  });
  return server;
}
