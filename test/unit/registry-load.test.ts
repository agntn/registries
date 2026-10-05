import type { RegistryConstructor } from "../../src/core/registry.ts";
import { create } from "../../src/core/registry.ts";

/* A stand-in adapter; the registry only constructs it and hands it back. */
class StubRegistry {
  readonly baseURL: string;
  readonly client: unknown;

  constructor(baseURL: string, client: unknown) {
    this.baseURL = baseURL;
    this.client = client;
  }
}

const stub = StubRegistry as unknown as RegistryConstructor;

const loads = vi.hoisted(() => ({
  shared: vi.fn<() => Promise<RegistryConstructor>>(),
  flaky: vi.fn<() => Promise<RegistryConstructor>>(),
}));

vi.mock("../../src/registries/index.ts", () => ({
  builtins: [
    { ecosystem: "shared", defaultURL: "https://shared.test", load: loads.shared },
    { ecosystem: "flaky", defaultURL: "https://flaky.test", load: loads.flaky },
  ],
}));

describe("built-in loader", () => {
  /* Under jiti (Pi, OMP) an overlapping import gets a namespace with no exports yet. */
  it("should run once for parallel cold creates", async () => {
    loads.shared.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 5, stub)));

    const registries = await Promise.all([create("shared"), create("shared"), create("shared")]);
    await create("shared");

    expect(loads.shared).toHaveBeenCalledTimes(1);
    expect(registries.every((registry) => registry instanceof StubRegistry)).toBe(true);
  });

  it("should run again after a failed import", async () => {
    loads.flaky.mockRejectedValueOnce(new Error("import failed")).mockResolvedValue(stub);

    await expect(create("flaky")).rejects.toThrow("import failed");
    await expect(create("flaky")).resolves.toMatchObject({ baseURL: "https://flaky.test" });
    expect(loads.flaky).toHaveBeenCalledTimes(2);
  });
});
