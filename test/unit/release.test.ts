import { readFileSync } from "node:fs";

const workflow = readFileSync(
  new URL("../../.github/workflows/release.yml", import.meta.url),
  "utf8",
);

/* The text of one job, from its key to the next key at the same indent. */
function job(name: string): string {
  const start = workflow.indexOf(`\n  ${name}:\n`);
  const next = workflow.slice(start + 1).search(/\n {2}[a-z]+:\n/u);
  return workflow.slice(start, next === -1 ? undefined : start + 1 + next);
}

describe("release workflow", () => {
  /** The bin tests skip without dist/cli.mjs, and a skipped test stops nothing from shipping. */
  it("should build before it tests the tag", () => {
    const steps = job("test");

    expect(steps).toContain("- run: pnpm build");
    expect(steps.indexOf("- run: pnpm build")).toBeLessThan(steps.indexOf("- run: pnpm test:run"));
  });

  it("should publish only what the tested tag packed", () => {
    expect(job("pack")).toContain("\n    needs: test\n");
    expect(job("publish")).toContain("\n    needs: pack\n");
  });
});
