import consola from "consola";
import type { Dependency } from "../../src/core/types.ts";
import { outputDeps } from "../../src/commands/deps.ts";

describe("outputDeps", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("outputs pure JSON when json flag is true", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const consolaLogSpy = vi.spyOn(consola, "log").mockImplementation(() => undefined);
    const consolaInfoSpy = vi.spyOn(consola, "info").mockImplementation(() => undefined);

    const deps: Dependency[] = [
      { name: "is-number", requirements: "^7.0.0", optional: false, scope: "runtime" },
    ];

    outputDeps("is-odd", "3.0.1", deps, true);

    expect(consolaLogSpy).not.toHaveBeenCalled();
    expect(consolaInfoSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(logSpy.mock.calls[0][0])).toEqual(deps);
  });

  it("outputs human readable table when json flag is false", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const consolaLogSpy = vi.spyOn(consola, "log").mockImplementation(() => undefined);

    const deps: Dependency[] = [
      { name: "is-number", requirements: "^7.0.0", optional: false, scope: "runtime" },
    ];

    outputDeps("is-odd", "3.0.1", deps, false);

    expect(logSpy).not.toHaveBeenCalled();
    expect(consolaLogSpy).toHaveBeenCalled();
  });
});
