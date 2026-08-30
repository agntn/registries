const { mockResolvePURL } = vi.hoisted(() => ({
  mockResolvePURL: vi.fn(),
}));

vi.mock("../../src/commands/shared.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/commands/shared.ts")>();
  return { ...actual, resolvePURL: mockResolvePURL };
});

import { runCommand } from "citty";
import consola from "consola";
import depsCommand from "../../src/commands/deps.ts";
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
    vi.restoreAllMocks();
    mockResolvePURL.mockReset();
  });

  it("keeps JSON output parseable when the version is inferred", async () => {
    const info = vi.spyOn(consola, "info").mockImplementation(() => undefined);
    const output = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await runCommand(depsCommand, { rawArgs: ["pkg:test/example", "--json", "--no-cache"] });

    const stdout = output.mock.calls.map(([value]) => String(value)).join("\n");
    expect(JSON.parse(stdout)).toEqual(dependencies);
    expect(info).not.toHaveBeenCalled();
  });

  it("keeps the inferred version notice in human output", async () => {
    const info = vi.spyOn(consola, "info").mockImplementation(() => undefined);
    vi.spyOn(consola, "log").mockImplementation(() => undefined);

    await runCommand(depsCommand, { rawArgs: ["pkg:test/example", "--no-cache"] });

    expect(info).toHaveBeenCalledWith("No version specified, using latest: 2.0.0");
  });
});
