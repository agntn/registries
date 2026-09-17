import { create, ecosystems } from "@agntn/registries";

/** The ecosystems the library ships, each adapter loaded once to confirm the key it answers to. */
export default defineEventHandler(async (event) => {
  markPublic(event, 60 * 60);
  return {
    ecosystems: await Promise.all(
      ecosystems().map(async (key) => {
        const registry = await create(key);
        return { key, ecosystem: registry.ecosystem() };
      }),
    ),
  };
});
