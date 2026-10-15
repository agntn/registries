import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/* Runs `src/cli.ts` with stdout closed before the first write, the way `| head -1` leaves it. */
async function withClosedStdout(...args: readonly string[]) {
  const child = spawn(
    process.execPath,
    [
      "--experimental-strip-types",
      fileURLToPath(new URL("../../src/cli.ts", import.meta.url)),
      ...args,
    ],
    {
      env: {
        ...process.env,
        CONSOLA_LEVEL: "3",
        REGISTRIES_CACHE_DIR: join(tmpdir(), "registries-closed-pipe"),
      },
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
    },
  );
  child.stdout.destroy();
  let stderr = "";
  child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
  await once(child, "close");
  return { code: child.exitCode, stderr };
}

describe("cli", () => {
  it("should end quietly when stdout closes", async () => {
    await expect(withClosedStdout("cache", "status")).resolves.toEqual({ code: 0, stderr: "" });
  });
});

const root = fileURLToPath(new URL("../..", import.meta.url));

const env = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] =>
      entry[0] !== "REGISTRIES_DIST" && entry[0] !== "NODE_OPTIONS" && entry[1] !== undefined,
  ),
);

/* Records the module URLs the child loaded into `file` on exit, since stderr would cut them. */
function recordLoads(file: string) {
  return `data:text/javascript,${encodeURIComponent(`
  import { writeFileSync } from "node:fs";
  import { registerHooks } from "node:module";
  const loaded = [];
  registerHooks({
    load(url, context, nextLoad) {
      loaded.push(url);
      return nextLoad(url, context);
    },
  });
  process.on("exit", () => writeFileSync(${JSON.stringify(file)}, JSON.stringify(loaded)));
`)}`;
}

const initialize = `${JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "registries-test", version: "1.0.0" },
  },
})}\n`;

/* Tells from the loaded module URLs whether `src/` or `dist/` answered, and `unknown` for both. */
function builtFrom(base: string, loaded: unknown) {
  const urls = Array.isArray(loaded) ? loaded.filter((url) => typeof url === "string") : [];
  const source = urls.includes(pathToFileURL(join(base, "src/mcp.ts")).href);
  const bundle = urls.includes(pathToFileURL(join(base, "dist/mcp.mjs")).href);
  if (source === bundle) return "unknown";
  return source ? "source" : "bundle";
}

/* The runtime dependencies `package.json` declares, which an install without dev ones keeps. */
function productionDependencies() {
  const manifest: unknown = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  if (typeof manifest !== "object" || manifest === null || !("dependencies" in manifest)) return [];
  const { dependencies } = manifest;
  return typeof dependencies === "object" && dependencies !== null ? Object.keys(dependencies) : [];
}

/* Sends one initialize request to `mcp` from the bin in `base` and tells which build answered. */
function serve(
  base: string,
  options: Readonly<{ env?: Readonly<Record<string, string>>; flags?: readonly string[] }> = {},
) {
  const record = mkdtempSync(join(tmpdir(), "registries-loaded-"));
  const file = join(record, "loaded.json");
  let loaded: unknown = [];
  let child;
  try {
    child = spawnSync(
      process.execPath,
      [...(options.flags ?? []), "--import", recordLoads(file), join(base, "dist/cli.mjs"), "mcp"],
      { encoding: "utf8", env: { ...env, ...options.env }, input: initialize, timeout: 20_000 },
    );
    if (existsSync(file)) loaded = JSON.parse(readFileSync(file, "utf8"));
  } finally {
    rmSync(record, { recursive: true, force: true });
  }
  const from = builtFrom(base, loaded);
  const name = /"serverInfo":\{"name":"([^"]+)"/.exec(child.stdout)?.[1];
  return { code: child.status, from, name, stderr: child.stderr };
}

/* The fields a run that answered the initialize request from `from` has to match. */
function served(from: "bundle" | "source") {
  return { code: 0, from, name: "registries" };
}

/* Copies checkout `entries` into a new directory under `parent`, which the caller removes. */
function copyCheckout(
  parent: string,
  entries: readonly string[] = ["dist", "src", "package.json"],
) {
  mkdirSync(parent, { recursive: true });
  const copy = mkdtempSync(join(parent, "registries-cli-"));
  for (const entry of entries) cpSync(join(root, entry), join(copy, entry), { recursive: true });
  return copy;
}

const refused = {
  isError: true,
  content: [
    { type: "text", text: "src/ changed under this server, restart it to load the new code" },
  ],
};

/* Starts `mcp` from the built bin of `checkout` and connects a client to it. */
async function connect(checkout: string, extra: Readonly<Record<string, string>> = {}) {
  const client = new Client({ name: "registries-test", version: "1.0.0" });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [join(checkout, "dist/cli.mjs"), "mcp"],
      env: { ...env, ...extra },
      stderr: "ignore",
    }),
  );
  return client;
}

describe.skipIf(!existsSync(join(root, "dist/cli.mjs")))(
  "registries mcp from the built bin",
  () => {
    it("should serve the live source inside a checkout", () => {
      expect(serve(root)).toMatchObject(served("source"));
    });

    it("should keep the bundle under REGISTRIES_DIST=1", () => {
      expect(serve(root, { env: { REGISTRIES_DIST: "1" } })).toMatchObject(served("bundle"));
    });

    it("should keep the bundle when Node does not strip types", () => {
      expect(serve(root, { flags: ["--no-experimental-strip-types"] })).toMatchObject(
        served("bundle"),
      );
    });

    it("should keep the bundle when the package sits under node_modules", () => {
      const nested = copyCheckout(join(root, "node_modules/.cache"));
      try {
        expect(serve(nested)).toMatchObject(served("bundle"));
      } finally {
        rmSync(nested, { recursive: true, force: true });
      }
    });

    it("should keep the bundle in a package that ships no src", () => {
      const packaged = copyCheckout(tmpdir(), ["dist", "package.json"]);
      try {
        symlinkSync(join(root, "node_modules"), join(packaged, "node_modules"), "dir");
        expect(serve(packaged)).toMatchObject(served("bundle"));
      } finally {
        rmSync(packaged, { recursive: true, force: true });
      }
    });

    it("should keep the bundle where typebox, which only dist inlines, is not installed", () => {
      const production = copyCheckout(tmpdir());
      try {
        const dependencies = productionDependencies();
        expect(dependencies).not.toContain("typebox");
        for (const name of dependencies) {
          mkdirSync(join(production, "node_modules", name, ".."), { recursive: true });
          symlinkSync(join(root, "node_modules", name), join(production, "node_modules", name));
        }
        expect(serve(production)).toMatchObject(served("bundle"));
      } finally {
        rmSync(production, { recursive: true, force: true });
      }
    });

    it("should refuse a call after a pull instead of mixing old and new modules", async () => {
      const checkout = copyCheckout(tmpdir());
      symlinkSync(join(root, "node_modules"), join(checkout, "node_modules"), "dir");
      const client = await connect(checkout);
      try {
        await client.listTools();
        const version = join(checkout, "src/version.ts");
        writeFileSync(version, `${readFileSync(version, "utf8")}export const ADDED = 1;\n`);

        /** The check comes before the name and the schema, which the pull may have changed too. */
        for (const [name, args] of [
          ["registries_ecosystems", {}],
          ["registries_ecosystems", { unexpected: true }],
          ["registries_added", {}],
        ] as const) {
          expect(await client.callTool({ name, arguments: args })).toMatchObject(refused);
        }
      } finally {
        await client.close();
        rmSync(checkout, { recursive: true, force: true });
      }
    });

    it("should blame a pull that lands mid-call for the failure, not the tool", async () => {
      const checkout = copyCheckout(tmpdir());
      symlinkSync(join(root, "node_modules"), join(checkout, "node_modules"), "dir");
      /** The executor writes into `src/` on every call and throws when the server says so. */
      const operations = join(checkout, "src/tool-operations.ts");
      writeFileSync(
        operations,
        `import { writeFileSync } from "node:fs";\n${readFileSync(operations, "utf8").replace(
          "  return jsonResult({ ecosystems: ecosystems().sort() });",
          `  writeFileSync(new URL("./pulled.ts", import.meta.url), "export {};\\n");
  if (process.env["REGISTRIES_TEST_FAIL"] === "1") throw new Error("boom");
  return jsonResult({ ecosystems: ecosystems().sort() });`,
        )}`,
      );
      const kept = await connect(checkout);
      try {
        const answer = await kept.callTool({ name: "registries_ecosystems", arguments: {} });
        expect(answer.isError).not.toBe(true);
      } finally {
        await kept.close();
      }
      const failing = await connect(checkout, { REGISTRIES_TEST_FAIL: "1" });
      try {
        expect(
          await failing.callTool({ name: "registries_ecosystems", arguments: {} }),
        ).toMatchObject(refused);
      } finally {
        await failing.close();
        rmSync(checkout, { recursive: true, force: true });
      }
    });
  },
);
