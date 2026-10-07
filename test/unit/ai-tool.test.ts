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

import { packageTool } from "../../src/ai.ts";

describe("packageTool", () => {
  it("has description and input schema", () => {
    expect(packageTool.description).toBeTypeOf("string");
    expect(packageTool.inputSchema).toBeDefined();
    expect(packageTool.execute).toBeTypeOf("function");
  });

  it("fetches package metadata", async () => {
    mockFetchPackageFromPURL.mockResolvedValueOnce({ name: "lodash", latestVersion: "4.17.21" });

    const result = await packageTool.execute!(
      { operation: "package", purl: "pkg:npm/lodash" },
      { toolCallId: "call-1", messages: [] },
    );

    expect(mockFetchPackageFromPURL).toHaveBeenCalledWith("pkg:npm/lodash", undefined);
    expect(result).toEqual({ name: "lodash", latestVersion: "4.17.21" });
  });

  it("fetches the newest versions and counts the rest", async () => {
    const history = Array.from({ length: 25 }, (_, index) => ({
      number: `1.${index}.0`,
      publishedAt: new Date(Date.UTC(2020, 0, index + 1)),
    }));
    mockFetchVersionsFromPURL.mockResolvedValue(history);

    const bounded = await packageTool.execute!(
      { operation: "versions", purl: "pkg:cargo/serde" },
      { toolCallId: "call-2", messages: [] },
    );
    const all = await packageTool.execute!(
      { operation: "versions", purl: "pkg:cargo/serde", limit: "all" },
      { toolCallId: "call-2b", messages: [] },
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

    const result = await packageTool.execute!(
      { operation: "dependencies", purl: "pkg:pypi/flask@3.1.1" },
      { toolCallId: "call-3", messages: [] },
    );

    expect(mockFetchDependenciesFromPURL).toHaveBeenCalledWith("pkg:pypi/flask@3.1.1", undefined);
    expect(result).toEqual([{ name: "click", requirements: ">=8.0" }]);
  });

  it("fetches maintainers", async () => {
    mockFetchMaintainersFromPURL.mockResolvedValueOnce([{ login: "dhh", role: "author" }]);

    const result = await packageTool.execute!(
      { operation: "maintainers", purl: "pkg:gem/rails" },
      { toolCallId: "call-4", messages: [] },
    );

    expect(mockFetchMaintainersFromPURL).toHaveBeenCalledWith("pkg:gem/rails", undefined);
    expect(result).toEqual([{ login: "dhh", role: "author" }]);
  });

  it("fetches bulk package metadata and serializes the map", async () => {
    mockBulkFetchPackages.mockResolvedValueOnce(
      new Map([
        ["pkg:npm/lodash", { name: "lodash" }],
        ["pkg:cargo/serde", { name: "serde" }],
      ]),
    );

    const result = await packageTool.execute!(
      {
        operation: "bulk-packages",
        purls: ["pkg:npm/lodash", "pkg:cargo/serde"],
        concurrency: 4,
      },
      { toolCallId: "call-5", messages: [] },
    );

    expect(mockBulkFetchPackages).toHaveBeenCalledWith(["pkg:npm/lodash", "pkg:cargo/serde"], {
      concurrency: 4,
      signal: undefined,
    });
    expect(result).toEqual({
      "pkg:npm/lodash": { name: "lodash" },
      "pkg:cargo/serde": { name: "serde" },
    });
  });
});
