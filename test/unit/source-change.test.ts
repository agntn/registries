import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sourceChangeCheck } from "../../src/source-change.ts";

const trees: string[] = [];

/* Lets the clock move on, so a change can't share the baseline's millisecond. */
async function later() {
  await new Promise((resolve) => setTimeout(resolve, 20));
}

/* A source tree with one nested module and a check whose baseline comes after it was written. */
async function guarded() {
  const tree = mkdtempSync(join(tmpdir(), "registries-source-"));
  trees.push(tree);
  mkdirSync(join(tree, "commands"));
  const file = join(tree, "commands/mcp.ts");
  writeFileSync(file, "export {};\n");
  await later();
  return { changed: sourceChangeCheck(tree, Date.now()), file, tree };
}

afterEach(() => {
  for (const tree of trees.splice(0)) rmSync(tree, { recursive: true, force: true });
});

describe("sourceChangeCheck", () => {
  it("should stay false while the tree stays as it was", async () => {
    const { changed } = await guarded();
    await later();

    expect(changed()).toBe(false);
  });

  it("should turn true once a nested file changes", async () => {
    const { changed, file } = await guarded();
    await later();
    writeFileSync(file, "export const added = 1;\n");

    expect(changed()).toBe(true);
  });

  it("should catch a change that kept its old mtime", async () => {
    const { changed, file } = await guarded();
    await later();
    writeFileSync(file, "export const added = 1;\n");
    utimesSync(file, new Date(0), new Date(0));

    expect(changed()).toBe(true);
  });

  it("should turn true once a file goes away", async () => {
    const { changed, file } = await guarded();
    await later();
    rmSync(file);

    expect(changed()).toBe(true);
  });

  it("should turn true when the whole tree goes away instead of throwing", async () => {
    const { changed, tree } = await guarded();
    rmSync(tree, { recursive: true, force: true });

    expect(changed()).toBe(true);
  });

  it("should count a change from before the check was built but after its baseline", async () => {
    const tree = mkdtempSync(join(tmpdir(), "registries-source-"));
    trees.push(tree);
    const since = Date.now();
    await later();
    writeFileSync(join(tree, "pulled.ts"), "export {};\n");

    expect(sourceChangeCheck(tree, since)()).toBe(true);
  });

  it("should turn true once a file comes in", async () => {
    const { changed, tree } = await guarded();
    await later();
    writeFileSync(join(tree, "added.ts"), "export {};\n");

    expect(changed()).toBe(true);
  });
});
