import { spawn } from "node:child_process";
import { once } from "node:events";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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
