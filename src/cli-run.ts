import { runCli, type CliOptions } from "@agntn/tools/cli";
import { PkioError } from "./core/errors.ts";
import { registriesCommands } from "./cli-commands.ts";
import { serverInfo } from "./server-info.ts";
import { registriesTools } from "./tools.ts";
import { version } from "./version.ts";

/**
 * The `registries` command line: a command per tool, with the lookups the CLI always had taking
 * the place of the generated ones.
 * @returns {CliOptions} What `runCli` builds the commands from.
 */
export function registriesCli(): CliOptions {
  return {
    name: "registries",
    version,
    description:
      "Universal package registry client. Query npm, PyPI, crates.io, RubyGems, Packagist and the AUR with a single PURL-native API.",
    tools: registriesTools(),
    commands: registriesCommands(),
    mcp: serverInfo,
    expected: (error) => error instanceof PkioError,
  };
}

/**
 * Runs one `registries` command line.
 * @param argv - The words after `registries`.
 * @returns {Promise<void>} Once the command has written its answer and set the exit code.
 */
export async function runRegistriesCli(argv: readonly string[]): Promise<void> {
  await runCli(registriesCli(), argv);
}
