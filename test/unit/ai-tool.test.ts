const {
  mockFetchPackageFromPURL,
  mockFetchVersionsFromPURL,
  mockFetchDependenciesFromPURL,
  mockFetchMaintainersFromPURL,
  mockBulkFetchPackages,
} = vi.hoisted(() => ({
  mockFetchPackageFromPURL: vi.fn(),
  mockFetchVersionsFromPURL: vi.fn(),
  mockFetchDependenciesFromPURL: vi.fn(),
  mockFetchMaintainersFromPURL: vi.fn(),
  mockBulkFetchPackages: vi.fn(),
}));

vi.mock("../../src/helpers.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/helpers.ts")>()),
  fetchPackageFromPURL: mockFetchPackageFromPURL,
  fetchVersionsFromPURL: mockFetchVersionsFromPURL,
  fetchDependenciesFromPURL: mockFetchDependenciesFromPURL,
  fetchMaintainersFromPURL: mockFetchMaintainersFromPURL,
  bulkFetchPackages: mockBulkFetchPackages,
}));

import {
  bulkPackagesTool,
  dependenciesTool,
  maintainersTool,
  packageTool,
  versionsTool,
} from "../../src/ai.ts";

/* The AI SDK 7 options every `execute` takes. */
function options(toolCallId: string) {
  return { toolCallId, messages: [], context: {} };
}

describe("AI SDK tools", () => {
  it("has description and input schema", () => {
    expect(packageTool.description).toBeTypeOf("string");
    expect(packageTool.inputSchema).toBeDefined();
    expect(packageTool.execute).toBeTypeOf("function");
  });

  it("fetches package metadata", async () => {
    mockFetchPackageFromPURL.mockResolvedValueOnce({ name: "lodash", latestVersion: "4.17.21" });

    const result = await packageTool.execute!({ purl: "pkg:npm/lodash" }, options("call-1"));

    expect(mockFetchPackageFromPURL).toHaveBeenCalledWith("pkg:npm/lodash", undefined, undefined);
    expect(result).toMatchObject({ name: "lodash", latestVersion: "4.17.21" });
    expect(result).toHaveProperty("text", '{"name":"lodash","latestVersion":"4.17.21"}');
  });

  it("fetches the newest versions and counts the rest", async () => {
    const history = Array.from({ length: 25 }, (_, index) => ({
      number: `1.${index}.0`,
      publishedAt: new Date(Date.UTC(2020, 0, index + 1)),
    }));
    mockFetchVersionsFromPURL.mockResolvedValue(history);

    const bounded = await versionsTool.execute!({ purl: "pkg:cargo/serde" }, options("call-2"));
    const all = await versionsTool.execute!(
      { purl: "pkg:cargo/serde", limit: "all" },
      options("call-2b"),
    );

    expect(mockFetchVersionsFromPURL).toHaveBeenCalledWith("pkg:cargo/serde", undefined, undefined);
    expect(bounded).toMatchObject({ order: "newest first", total: 25, omitted: 5 });
    expect(bounded).toHaveProperty("versions.0.number", "1.24.0");
    expect(bounded).toHaveProperty("versions.length", 20);
    expect(all).toMatchObject({ total: 25, omitted: 0 });
    expect(all).toHaveProperty("versions.length", 25);
  });

  it("fetches dependencies", async () => {
    mockFetchDependenciesFromPURL.mockResolvedValueOnce([{ name: "click", requirements: ">=8.0" }]);

    const result = await dependenciesTool.execute!(
      { purl: "pkg:pypi/flask@3.1.1" },
      options("call-3"),
    );

    expect(mockFetchDependenciesFromPURL).toHaveBeenCalledWith(
      "pkg:pypi/flask@3.1.1",
      undefined,
      undefined,
    );
    expect(result).toHaveProperty("dependencies", [{ name: "click", requirements: ">=8.0" }]);
  });

  it("fetches maintainers", async () => {
    mockFetchMaintainersFromPURL.mockResolvedValueOnce([{ login: "dhh", role: "author" }]);

    const result = await maintainersTool.execute!({ purl: "pkg:gem/rails" }, options("call-4"));

    expect(mockFetchMaintainersFromPURL).toHaveBeenCalledWith(
      "pkg:gem/rails",
      undefined,
      undefined,
    );
    expect(result).toHaveProperty("maintainers", [{ login: "dhh", role: "author" }]);
  });

  it("fetches bulk package metadata and serializes the map", async () => {
    mockBulkFetchPackages.mockResolvedValueOnce(
      new Map([
        ["pkg:npm/lodash", { name: "lodash" }],
        ["pkg:cargo/serde", { name: "serde" }],
      ]),
    );

    const result = await bulkPackagesTool.execute!(
      { purls: ["pkg:npm/lodash", "pkg:cargo/serde"], concurrency: 4 },
      options("call-5"),
    );

    expect(mockBulkFetchPackages).toHaveBeenCalledWith(["pkg:npm/lodash", "pkg:cargo/serde"], {
      concurrency: 4,
      signal: undefined,
      client: undefined,
    });
    expect(result).toMatchObject({
      "pkg:npm/lodash": { name: "lodash" },
      "pkg:cargo/serde": { name: "serde" },
    });
  });
});
