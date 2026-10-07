import { Client } from "../../src/core/client.ts";
import {
  bulkPackagesOperation,
  dependenciesOperation,
  ecosystemsOperation,
  fetchRecentVersions,
  maintainersOperation,
  packageOperation,
  versionsOperation,
} from "../../src/tool-operations.ts";

describe("registry tool operations", () => {
  it.each([
    ["package", packageOperation],
    ["versions", versionsOperation],
    ["dependencies", dependenciesOperation],
    ["maintainers", maintainersOperation],
  ] as const)("serializes %s results without formatting whitespace", async (_name, operation) => {
    const client = new Client();
    vi.spyOn(client, "getJSON").mockResolvedValue({
      name: "example",
      description: 'Two  spaces\n\t"quoted" \\ path 日本語',
      "dist-tags": { latest: "1.0.0" },
      versions: { "1.0.0": { name: "example", version: "1.0.0" }, "0.9.0": {} },
      time: { "1.0.0": "2026-01-01T00:00:00.000Z" },
      dependencies: { required: "^1.0.0" },
      optionalDependencies: { optional: "^2.0.0" },
      maintainers: [{ name: "example", email: "example@example.com" }],
    });

    const result = await operation({ purl: "pkg:npm/example@1.0.0" }, undefined, client);
    const text = result.content[0]?.text ?? "";

    expect(text).toBe(JSON.stringify(result.details));
    expect(JSON.parse(text)).toEqual(JSON.parse(JSON.stringify(result.details, null, 2)));
  });

  function npmHistory(count: number): Record<string, unknown> {
    const numbers = Array.from({ length: count }, (_, index) => `1.${index}.0`);
    return {
      name: "example",
      "dist-tags": { latest: numbers.at(-1) },
      versions: Object.fromEntries(numbers.map((number) => [number, {}])),
      time: Object.fromEntries(
        numbers.map((number, index) => [
          number,
          new Date(Date.UTC(2020, 0, index + 1)).toISOString(),
        ]),
      ),
    };
  }

  it("should hand an agent the 20 newest versions and count the rest", async () => {
    const client = new Client();
    vi.spyOn(client, "getJSON").mockResolvedValue(npmHistory(25));

    const { details } = await versionsOperation({ purl: "pkg:npm/example" }, undefined, client);

    expect(details).toMatchObject({ order: "newest first", total: 25, omitted: 5 });
    expect(details.versions.map(({ number }) => number)).toHaveLength(20);
    expect(details.versions.map(({ number }) => number).slice(0, 2)).toEqual(["1.24.0", "1.23.0"]);
    expect(details.versions.map(({ number }) => number).at(-1)).toBe("1.5.0");
  });

  it("should honour an explicit limit and hand over the whole history for all", async () => {
    const client = new Client();
    vi.spyOn(client, "getJSON").mockResolvedValue(npmHistory(25));

    const three = await versionsOperation({ purl: "pkg:npm/example", limit: 3 }, undefined, client);
    const all = await versionsOperation(
      { purl: "pkg:npm/example", limit: "all" },
      undefined,
      client,
    );

    expect(three.details.versions.map(({ number }) => number)).toEqual([
      "1.24.0",
      "1.23.0",
      "1.22.0",
    ]);
    expect(three.details.omitted).toBe(22);
    expect(all.details.versions).toHaveLength(25);
    expect(all.details.omitted).toBe(0);
    expect(all.details.versions.map(({ number }) => number).at(-1)).toBe("1.0.0");
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "ALL", "20", null])(
    "should refuse limit %j before a request even when a host skips schema validation",
    async (limit) => {
      const client = new Client();
      const request = vi.spyOn(client, "getJSON").mockResolvedValue(npmHistory(1));
      /** SAFETY: the value stands in for arguments a host passed through unchecked. */
      const params = { purl: "pkg:npm/example", limit } as unknown as { purl: string };

      await expect(versionsOperation(params, undefined, client)).rejects.toThrow(
        'Version limit must be a positive integer or "all"',
      );
      await expect(
        fetchRecentVersions("pkg:npm/example", limit as never, undefined, client),
      ).rejects.toThrow("Version limit");
      expect(request).not.toHaveBeenCalled();
    },
  );

  it("keeps bulk package results complete in compact JSON", async () => {
    const client = new Client();
    vi.spyOn(client, "getJSON").mockResolvedValue({
      name: "example",
      "dist-tags": { latest: "1.0.0" },
      versions: { "1.0.0": {} },
    });
    const result = await bulkPackagesOperation({ purls: ["pkg:npm/example"] }, undefined, client);

    expect(Object.keys(result.details)).toEqual(["pkg:npm/example"]);
    expect(result.content[0]?.text).toBe(JSON.stringify(result.details));
  });

  it("discovers every registered ecosystem without network access", async () => {
    const result = await ecosystemsOperation();

    expect(result.details).toEqual({
      ecosystems: ["alpm", "cargo", "composer", "gem", "npm", "pypi"],
    });
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toContain('"npm"');
  });

  it("normalizes package metadata through the existing registry adapter", async () => {
    const client = new Client();
    vi.spyOn(client, "getJSON").mockResolvedValueOnce({
      name: "example-package",
      description: "Fixture package",
      "dist-tags": { latest: "1.2.3" },
      versions: { "1.2.3": { name: "example-package", version: "1.2.3" } },
    });

    const result = await packageOperation({ purl: "pkg:npm/example-package" }, undefined, client);

    expect(result.details).toMatchObject({
      name: "example-package",
      latestVersion: "1.2.3",
    });
  });

  it("rejects custom repository URLs before making a request", async () => {
    const client = new Client();
    const request = vi
      .spyOn(client, "getJSON")
      .mockRejectedValueOnce(new Error("network boundary reached"));

    await expect(
      packageOperation(
        {
          purl: "pkg:npm/example?repository_url=http%3A%2F%2F127.0.0.1%3A8000%2Finternal",
        },
        undefined,
        client,
      ),
    ).rejects.toThrow("repository_url is not allowed");
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects oversized bulk requests even when a host skips schema validation", async () => {
    await expect(
      bulkPackagesOperation({ purls: Array.from({ length: 51 }, () => "pkg:npm/example") }),
    ).rejects.toThrow("at most 50");
  });
});
