import { bulk } from "../../src/commands/bulk.ts";
import { Client } from "../../src/core/client.ts";

describe("bulk command", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should take the shorthand PURLs the other commands take", async () => {
    vi.spyOn(Client.prototype, "getJSON").mockResolvedValue({
      name: "example",
      "dist-tags": { latest: "1.0.0" },
      versions: { "1.0.0": {} },
    });

    const result = await bulk({ purls: ["npm/example", "pkg:npm/other"] });

    expect(Object.keys(result.details).toSorted()).toEqual(["pkg:npm/example", "pkg:npm/other"]);
  });
});
