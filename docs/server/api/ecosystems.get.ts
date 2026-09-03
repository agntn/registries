import { create, ecosystems } from "@agntn/registries";

/** The ecosystems the library registered at import, with the registry URL each one builds for an example. */
export default defineEventHandler((event) => {
  markPublic(event, 60 * 60);
  return {
    ecosystems: ecosystems().map((key) => {
      const registry = create(key);
      return { key, ecosystem: registry.ecosystem() };
    }),
  };
});
