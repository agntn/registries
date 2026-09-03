import { DEFAULT_TTL, type Maintainer } from "@agntn/registries";

export interface MaintainersAnswer {
  purl: string;
  ecosystem: string;
  name: string;
  maintainers: Maintainer[];
  fetchedAt: string;
}

/** Maintainers through `fetchMaintainers`, cached for a day like the library does. */
export default defineEventHandler(async (event) => {
  const purl = readPurl(getQuery(event));
  const lookup = resolveLookup(purl);
  const params = { ecosystem: lookup.ecosystem, name: lookup.name };
  try {
    return await cachedAnswer<MaintainersAnswer>(event, "maintainers", params, DEFAULT_TTL.maintainers, async () => {
      const maintainers = await lookup.registry.fetchMaintainers(lookup.name);
      return {
        purl: lookup.registry.urls().purl(lookup.name),
        ecosystem: lookup.ecosystem,
        name: lookup.name,
        maintainers,
        fetchedAt: new Date().toISOString(),
      };
    });
  } catch (error) {
    return toHttpError(error);
  }
});
