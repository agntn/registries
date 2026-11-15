import { globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const docsDir = fileURLToPath(new URL("../../docs/", import.meta.url));

/** An import or re-export opening a line, or `import()` anywhere. Never a snippet in a string. */
const SPECIFIER =
  /^\s*(?:import|export|\})\b[^"'\n]*?\bfrom\s*["']([^"']+)["']|^\s*import\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']/gmu;

/** Not a package, whatever it looks like: a relative path, a Nuxt alias, a builtin. */
const LOCAL = /^(?:[.~#]|node:)/u;

/* The package a bare specifier names: `@scope/name` or `name`, without a subpath. */
function packageName(specifier: string): string {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] ?? specifier);
}

/* Packages the site's own sources import. The library is an alias for `../src` and stays out. */
function importedPackages(): Set<string> {
  const files = globSync(["app/**/*.{ts,vue}", "server/**/*.ts", "shared/**/*.ts", "*.ts"], {
    cwd: docsDir,
  });
  const names = new Set<string>();
  for (const file of files) {
    for (const match of readFileSync(`${docsDir}${file}`, "utf8").matchAll(SPECIFIER)) {
      const specifier = match[1] ?? match[2] ?? match[3] ?? "";
      if (!LOCAL.test(specifier)) {
        const name = packageName(specifier);
        if (name !== "@agntn/registries") names.add(name);
      }
    }
  }
  return names;
}

describe("docs dependencies", () => {
  it("should declare every package the site imports, since the workspace hoists nothing", () => {
    const manifest = JSON.parse(readFileSync(`${docsDir}package.json`, "utf8")) as {
      readonly dependencies?: Readonly<Record<string, string>>;
      readonly devDependencies?: Readonly<Record<string, string>>;
    };
    const declared = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.devDependencies ?? {}),
    ]);
    const imported = importedPackages();
    expect(imported).toContain("@nuxtjs/mcp-toolkit");
    expect([...imported].filter((name) => !declared.has(name))).toEqual([]);
  });
});
