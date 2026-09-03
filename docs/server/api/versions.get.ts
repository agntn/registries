import { DEFAULT_TTL, type Version } from "@agntn/registries";

/** A version as it crosses the wire: `publishedAt` is an ISO string or null. */
export type WireVersion = Omit<Version, "publishedAt"> & { publishedAt: string | null };

export interface VersionsAnswer {
  purl: string;
  ecosystem: string;
  name: string;
  total: number;
  versions: WireVersion[];
  fetchedAt: string;
}

function newestFirst(a: Readonly<Version>, b: Readonly<Version>): number {
  if (a.publishedAt === null) return b.publishedAt === null ? 0 : 1;
  if (b.publishedAt === null) return -1;
  return b.publishedAt.getTime() - a.publishedAt.getTime();
}

/** Every published version through `fetchVersions`, newest first, cut to `limit`. */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const purl = readPurl(query);
  const limit = readInt(query, "limit", 1, LIMITS.versions) ?? 30;
  const lookup = resolveLookup(purl);
  const params = { ecosystem: lookup.ecosystem, name: lookup.name, limit };
  try {
    return await cachedAnswer<VersionsAnswer>(event, "versions", params, DEFAULT_TTL.versions, async () => {
      const versions = await lookup.registry.fetchVersions(lookup.name);
      const shown = versions.toSorted(newestFirst).slice(0, limit);
      return {
        purl: lookup.registry.urls().purl(lookup.name),
        ecosystem: lookup.ecosystem,
        name: lookup.name,
        total: versions.length,
        versions: shown.map((version) => ({
          ...version,
          publishedAt: version.publishedAt ? version.publishedAt.toISOString() : null,
        })),
        fetchedAt: new Date().toISOString(),
      };
    });
  } catch (error) {
    return toHttpError(error);
  }
});
