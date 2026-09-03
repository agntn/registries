import { DEFAULT_TTL, type Dependency } from "@agntn/registries";

export interface DependenciesAnswer {
  purl: string;
  ecosystem: string;
  name: string;
  /** The version the dependencies belong to; the latest one when the PURL had none. */
  version: string;
  resolvedLatest: boolean;
  dependencies: Dependency[];
  fetchedAt: string;
}

/** Dependencies of one version; without a version the latest is resolved first, like the CLI. */
export default defineEventHandler(async (event) => {
  const purl = readPurl(getQuery(event));
  const lookup = resolveLookup(purl);
  try {
    let version = lookup.version;
    let resolvedLatest = false;
    if (!version) {
      const pkg = await cachedAnswer(
        event,
        "latest",
        { ecosystem: lookup.ecosystem, name: lookup.name },
        DEFAULT_TTL.package,
        () => lookup.registry.fetchPackage(lookup.name),
      );
      if (!pkg.latestVersion) {
        throw createError({ statusCode: 400, statusMessage: "The PURL has no version and the registry reports no latest version" });
      }
      version = pkg.latestVersion;
      resolvedLatest = true;
    }
    const params = { ecosystem: lookup.ecosystem, name: lookup.name, version };
    return await cachedAnswer<DependenciesAnswer>(event, "dependencies", params, DEFAULT_TTL.dependencies, async () => {
      const dependencies = await lookup.registry.fetchDependencies(lookup.name, version);
      return {
        purl: lookup.registry.urls().purl(lookup.name, version),
        ecosystem: lookup.ecosystem,
        name: lookup.name,
        version,
        resolvedLatest,
        dependencies,
        fetchedAt: new Date().toISOString(),
      };
    });
  } catch (error) {
    return toHttpError(error);
  }
});
