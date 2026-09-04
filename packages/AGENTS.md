# Agent runtime integrations

This subtree contains distributable Pi and OMP extensions for `@agntn/registries`.

- Extension entrypoints must stay source-first for local development and fall back to built files from `dist/` in packed installations.
- Pi may choose the source or distribution module dynamically.
- OMP requires literal imports for both source and distribution paths because its loader rewrites visible imports.
- Tool execution belongs in `src/tool-operations.ts`; extensions only declare host metadata and delegate.
- All registry operations are read-only. OMP tools declare `approval: "read"`.
- Keep tool names, schemas, descriptions, and tests aligned across Pi, OMP, and MCP.
