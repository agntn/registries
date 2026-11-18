/**
 * Serves the MCP server over stdio, which owns stdout: anything else printed there breaks the
 * client. The server and the SDK load here, so `registries --help` never does.
 * @returns {Promise<void>} Once the server listens.
 */
export async function serveMcp(): Promise<void> {
  const [{ createMcpServer }, { serveStdio }] = await Promise.all([
    import("../mcp.ts"),
    import("@modelcontextprotocol/server/stdio"),
  ]);
  serveStdio(() => createMcpServer());
}
