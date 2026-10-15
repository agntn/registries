/**
 * Serves the MCP server over stdio, which owns stdout: anything else printed there breaks the
 * client. The server and the SDK load here, so `registries --help` never does.
 * @returns {Promise<void>} Once the transport is connected.
 */
export async function serveMcp(): Promise<void> {
  const [{ createMcpServer }, { StdioServerTransport }] = await Promise.all([
    import("../mcp.ts"),
    import("@modelcontextprotocol/server/stdio"),
  ]);
  await createMcpServer().connect(new StdioServerTransport());
}
