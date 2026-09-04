import { Client } from "../../src/core/client.ts";
import {
  bulkPackagesOperation,
  ecosystemsOperation,
  packageOperation,
} from "../../src/tool-operations.ts";

describe("registry tool operations", () => {
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
