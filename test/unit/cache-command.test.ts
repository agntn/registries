import { defineCommand, runCommand } from "citty";
import { createStorage } from "unstorage";
import { configureStorage, disposeStorage } from "../../src/cache/storage.ts";
import info from "../../src/commands/info.ts";
import versions from "../../src/commands/versions.ts";
import deps from "../../src/commands/deps.ts";
import maintainers from "../../src/commands/maintainers.ts";

const version = {
  name: "example",
  version: "1.0.0",
  license: "MIT",
  dependencies: { dependency: "^2.0.0" },
};
const payload = {
  ...version,
  "dist-tags": { latest: "1.0.0" },
  versions: { "1.0.0": version },
  maintainers: [{ name: "publisher", email: "publisher@example.com" }],
};

const cli = defineCommand({ subCommands: { info, versions, deps, maintainers } });
const commands = [
  { name: "info", command: "info", purl: "npm/example", requests: 1 },
  { name: "versions", command: "versions", purl: "npm/example", requests: 1 },
  { name: "deps", command: "deps", purl: "npm/example@1.0.0", requests: 1 },
  { name: "deps with inferred version", command: "deps", purl: "npm/example", requests: 2 },
  { name: "maintainers", command: "maintainers", purl: "npm/example", requests: 1 },
];

describe.each(commands)("$name cache flags", ({ command, purl, requests }) => {
  const storage = createStorage();
  const fetch = vi.fn(async () => Response.json(payload));

  beforeEach(async () => {
    await storage.clear();
    configureStorage(storage);
    fetch.mockClear();
    vi.stubGlobal("fetch", fetch);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    await disposeStorage();
  });

  it("should bypass cache reads and writes with --no-cache on an empty cache", async () => {
    const read = vi.spyOn(storage, "getItem");
    const write = vi.spyOn(storage, "setItem");

    await runCommand(cli, { rawArgs: [command, purl, "--json", "--no-cache"] });

    expect(fetch).toHaveBeenCalledTimes(requests);
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(await storage.getKeys()).toEqual([]);
  });

  it.each([{ flags: [] }, { flags: ["--cache"] }])(
    "should reuse cached results with flags $flags and bypass them with --no-cache",
    async ({ flags }) => {
      const rawArgs = [command, purl, "--json", ...flags];
      await runCommand(cli, { rawArgs });
      await runCommand(cli, { rawArgs });

      expect(fetch).toHaveBeenCalledTimes(requests);
      expect(await storage.getKeys()).not.toEqual([]);

      const read = vi.spyOn(storage, "getItem");
      const write = vi.spyOn(storage, "setItem");
      await runCommand(cli, { rawArgs: [command, purl, "--json", "--no-cache"] });

      expect(fetch).toHaveBeenCalledTimes(requests * 2);
      expect(read).not.toHaveBeenCalled();
      expect(write).not.toHaveBeenCalled();
    },
  );
});
