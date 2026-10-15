const { mockResolvePURL } = vi.hoisted(() => ({
  mockResolvePURL: vi.fn(),
}));

vi.mock("../../src/commands/shared.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/commands/shared.ts")>();
  return { ...actual, resolvePURL: mockResolvePURL };
});

import { deps } from "../../src/commands/deps.ts";
import type { Dependency } from "../../src/core/types.ts";

const dependencies: Dependency[] = [
  { name: "example-dependency", requirements: "^1.0.0", scope: "runtime", optional: false },
];

describe("deps command", () => {
  beforeEach(() => {
    mockResolvePURL.mockReturnValue([
      {
        fetchPackage: async () => ({ latestVersion: "2.0.0" }),
        fetchDependencies: async () => dependencies,
      },
      "example",
      "",
    ]);
  });

  afterEach(() => {
    mockResolvePURL.mockReset();
  });

  it("keeps the details to the dependencies when the version is inferred", async () => {
    const result = await deps({ purl: "pkg:test/example", cache: false });

    expect(result.details).toEqual(dependencies);
  });

  it("keeps the inferred version notice in human output", async () => {
    const result = await deps({ purl: "pkg:test/example", cache: false });
    const block = result.content[0];

    expect(block?.type === "text" ? block.text.split("\n")[0] : "").toBe(
      "No version specified, using latest: 2.0.0",
    );
  });
});
