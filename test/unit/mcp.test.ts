import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client as RegistryClient } from "../../src/core/client.ts";
import { callTool, createMcpServer, toolListings } from "../../src/mcp.ts";

const openConnections: Array<{ close(): Promise<void> }> = [];

afterEach(async () => {
  await Promise.all(openConnections.splice(0).map((connection) => connection.close()));
});

async function connectTestClient(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer();
  const client = new Client({ name: "registries-test", version: "1.0.0" });
  openConnections.push(client, server);
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe("Registries MCP server", () => {
  it("discovers every tool and executes ecosystem discovery", async () => {
    const client = await connectTestClient();

    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name)).toEqual([
      "registries_package",
      "registries_versions",
      "registries_dependencies",
      "registries_maintainers",
      "registries_bulk_packages",
      "registries_ecosystems",
    ]);

    const response = await client.callTool({ name: "registries_ecosystems", arguments: {} });
    expect(response.isError).not.toBe(true);
    expect(response.content).toEqual([
      {
        type: "text",
        text: '{"ecosystems":["alpm","cargo","composer","gem","npm","pypi"]}',
      },
    ]);
  });

  it("serves the advertised CLI over stdio", async () => {
    const client = new Client({ name: "registries-stdio-test", version: "1.0.0" });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [
        "--experimental-strip-types",
        fileURLToPath(new URL("../../src/cli.ts", import.meta.url)),
        "mcp",
      ],
      cwd: fileURLToPath(new URL("../..", import.meta.url)),
      stderr: "pipe",
    });
    openConnections.push(client);

    await client.connect(transport);
    const listed = await client.listTools();

    expect(listed.tools).toHaveLength(6);
  });

  it("rejects an oversized bulk lookup at the protocol boundary", async () => {
    const client = await connectTestClient();
    const response = await client.callTool({
      name: "registries_bulk_packages",
      arguments: { purls: Array.from({ length: 51 }, () => "pkg:npm/example") },
    });

    expect(response.isError).toBe(true);
  });

  it("returns unknown tools as errors without allowing line injection", async () => {
    const client = await connectTestClient();
    const response = await client.callTool({ name: "bad\ntool", arguments: {} });

    expect(response.isError).toBe(true);
    expect(response.content).toEqual([
      {
        type: "text",
        text: "Unknown registries tool: bad tool",
      },
    ]);
  });

  it("should answer through toolListings and callTool as tools/list and tools/call do", async () => {
    const client = await connectTestClient();
    expect((await client.listTools()).tools).toEqual(toolListings);
    const calls: Array<[string, Record<string, unknown>]> = [
      ["registries_ecosystems", {}],
      ["registries_package", {}],
      ["registries_package", { purl: "pkg:npm/lodash", extra: true }],
      ["registries_package", { purl: "pkg:npm/lodash?repository_url=https://evil.test" }],
      ["registries_bulk_packages", { purls: [] }],
      ["registries_nope", {}],
    ];
    for (const [name, args] of calls) {
      expect(await callTool(name, args)).toEqual(await client.callTool({ name, arguments: args }));
    }
  });

  it("should have one docs /mcp tool file per listed tool", () => {
    const files = readdirSync(new URL("../../docs/server/mcp/tools/", import.meta.url));
    expect(files.toSorted()).toEqual(
      toolListings.map((tool) => `${tool.name.replaceAll("_", "-")}.ts`).toSorted(),
    );
  });

  it("should send the registry requests through the client the caller passes", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response("", { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    try {
      const result = await callTool(
        "registries_package",
        { purl: "pkg:npm/defu" },
        undefined,
        new RegistryClient({ maxRetries: 0, userAgent: "probe" }),
      );
      expect(result.isError).toBe(true);
      expect(fetch).toHaveBeenCalledOnce();
      expect(new Headers(fetch.mock.calls[0]?.[1]?.headers).get("User-Agent")).toBe("probe");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
