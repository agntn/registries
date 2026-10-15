# Agent runtime integrations

This subtree contains distributable Pi and OMP extensions for `@agntn/registries`.

- Extension entrypoints must stay source-first for local development and fall back to built files from `dist/` in packed installations.
- Pi may choose the source or distribution module dynamically.
- OMP requires literal imports for both source and distribution paths because its loader rewrites visible imports.
- The tools are defined once in `src/tools.ts`. Each extension loads that list and hands it to `registerPiTools` or `registerOmpTools` from `@agntn/tools`, nothing more.
- All registry operations are read-only: `effect: "read"`, which the OMP adapter turns into `approval: "read"`.
