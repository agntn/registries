import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { callTool } from "@agntn/tools/mcp";
import { Client as RegistryClient } from "../../src/core/client.ts";
import { createMcpServer } from "../../src/mcp.ts";
import { serverInfo } from "../../src/server-info.ts";
import { registriesTools } from "../../src/tools.ts";

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

  it("should introduce itself with a description and icons the site serves", async () => {
    const client = await connectTestClient();

    expect(client.getServerVersion()).toEqual(serverInfo);
    for (const icon of serverInfo.icons) {
      const file = new URL(`../../docs/public${new URL(icon.src).pathname}`, import.meta.url);
      expect(existsSync(file), icon.src).toBe(true);
    }
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

    expect(client.getServerVersion()).toEqual(serverInfo);
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

  it("should take a positive integer or all as the version limit at the protocol boundary", async () => {
    const client = await connectTestClient();
    const versions = (await client.listTools()).tools.find(
      ({ name }) => name === "registries_versions",
    );
    const limit = versions?.inputSchema.properties?.["limit"];

    expect(limit).toMatchObject({ anyOf: [{ type: "integer", minimum: 1 }, { enum: ["all"] }] });
    for (const bad of [0, 2.5, "every"]) {
      const response = await client.callTool({
        name: "registries_versions",
        arguments: { purl: "pkg:npm/lodash", limit: bad },
      });
      expect(response.isError).toBe(true);
      expect(JSON.stringify(response.content)).toContain("/limit");
    }
  });

  it("returns unknown tools as errors without allowing line injection", async () => {
    const client = await connectTestClient();
    const response = await client.callTool({ name: "bad\ntool", arguments: {} });

    expect(response.isError).toBe(true);
    expect(response.content).toEqual([
      {
        type: "text",
        text: String.raw`Unknown registries tool: "bad\ntool"`,
      },
    ]);
  });

  it("should list a title for people and hints that say every lookup reads", async () => {
    const client = await connectTestClient();
    for (const tool of (await client.listTools()).tools) {
      expect(tool.annotations?.title).toBe(tool.title);
      expect(tool.annotations?.readOnlyHint).toBe(true);
    }
  });

  it.each([
    ["registries_package", {}],
    ["registries_package", { purl: "pkg:npm/lodash", extra: true }],
    ["registries_bulk_packages", { purls: [] }],
  ])("should refuse %s with %j before any registry request", async (name, args) => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    vi.stubGlobal("fetch", fetch);
    try {
      const response = await (await connectTestClient()).callTool({ name, arguments: args });
      expect(response.isError).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("should refuse a repository_url, which would send the request elsewhere", async () => {
    const client = await connectTestClient();
    const response = await client.callTool({
      name: "registries_package",
      arguments: { purl: "pkg:npm/lodash?repository_url=https://evil.test" },
    });

    expect(response.isError).toBe(true);
    expect(JSON.stringify(response.content)).toContain("repository_url is not allowed");
  });

  it("should send the registry requests through the client the caller passes", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response("", { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    try {
      const result = await callTool(
        serverInfo,
        registriesTools({ client: new RegistryClient({ maxRetries: 0, userAgent: "probe" }) }),
        "registries_package",
        { purl: "pkg:npm/defu" },
      );
      expect(result.isError).toBe(true);
      expect(fetch).toHaveBeenCalledOnce();
      expect(new Headers(fetch.mock.calls[0]?.[1]?.headers).get("User-Agent")).toBe("probe");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
