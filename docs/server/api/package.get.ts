import { DEFAULT_TTL, resolveDocsUrl, type Package } from "@agntn/registries";

/** What the lookup explorer and the landing show for one package. */
export interface PackageAnswer {
  purl: string;
  ecosystem: string;
  name: string;
  package: Package;
  urls: {
    registry: string;
    documentation: string;
    readme: string;
    purl: string;
  };
  fetchedAt: string;
}

/** Package metadata through `fetchPackage`, cached for the library's own package TTL. */
export default defineEventHandler(async (event) => {
  const purl = readPurl(getQuery(event));
  const lookup = resolveLookup(purl);
  const params = { ecosystem: lookup.ecosystem, name: lookup.name };
  try {
    return await cachedAnswer<PackageAnswer>(event, "package", params, DEFAULT_TTL.package, async () => {
      const pkg = await lookup.registry.fetchPackage(lookup.name);
      const urls = lookup.registry.urls();
      const version = pkg.latestVersion || undefined;
      return {
        purl: urls.purl(lookup.name),
        ecosystem: lookup.ecosystem,
        name: lookup.name,
        package: pkg,
        urls: {
          registry: urls.registry(lookup.name),
          documentation: resolveDocsUrl(pkg, urls, version),
          readme: urls.readme(lookup.name, version),
          purl: urls.purl(lookup.name, version),
        },
        fetchedAt: new Date().toISOString(),
      };
    });
  } catch (error) {
    return toHttpError(error);
  }
});
