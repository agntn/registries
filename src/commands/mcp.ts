import { defineCommand } from "citty";

export default defineCommand({
  meta: {
    name: "mcp",
    description: "Start the package registry MCP server over stdio",
  },
  async run() {
    const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
    const { createMcpServer } = await import("../mcp.ts");
    await createMcpServer().connect(new StdioServerTransport());
  },
});
