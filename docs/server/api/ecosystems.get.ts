import { builtins } from "@agntn/registries/registries";

/** The ecosystems the library ships, read from the manifest so no adapter loads for a listing. */
export default defineEventHandler((event) => {
  markPublic(event, 60 * 60);
  return {
    ecosystems: builtins.map(({ ecosystem, defaultURL }) => ({ key: ecosystem, defaultURL })),
  };
});
