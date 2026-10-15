# COMMANDS GUIDE

## OVERVIEW

`src/commands` holds what the CLI's own commands run. The commands themselves are `defineTool` entries in `src/cli-commands.ts`, which `runCli` from `@agntn/tools/cli` builds next to the commands it generates from `src/tools.ts`. Each entry imports its file here only in `execute`, so `registries --help` loads none of them.

## STRUCTURE

```text
src/commands/
|- shared.ts       # shorthand PURLs, the cached resolver, failure lines, text results
|- info.ts         # package card
|- versions.ts     # newest releases
|- deps.ts         # one release's dependencies, the latest when the PURL names none
|- maintainers.ts  # maintainer list
|- bulk.ts         # the bulk tool with shorthand PURLs
|- cache.ts        # cache status/path/clear/prune
`- mcp.ts          # serveMcp, the stdio server `src/cli.ts` starts
```

## CONVENTIONS

- Commands are thin orchestration layers; domain logic stays in core/helpers/cache.
- A lookup returns its text as the tool result and its data as `details`, which `--json` prints.
- A failure the library types becomes an `isError` result through `answer()`: stderr, exit code 1. Anything else keeps its stack.
- Text has no colors. `runCli` strips escape sequences anyway.

## ANTI-PATTERNS

- Do not reimplement PURL parsing in individual command files.
- Do not mutate cache internals directly from commands; use cache API.
- Do not import a command file statically from `src/cli-commands.ts`.
