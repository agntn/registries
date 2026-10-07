import { tool } from "ai";
import { z } from "zod";
import {
  bulkFetchPackages,
  fetchDependenciesFromPURL,
  fetchMaintainersFromPURL,
  fetchPackageFromPURL,
} from "./helpers.ts";
import { DEFAULT_VERSIONS_LIMIT, fetchRecentVersions } from "./tool-operations.ts";

export const packageTool = tool({
  description: `Query package metadata from npm, PyPI, crates.io, RubyGems, Packagist, and Arch Linux using PURLs. Supports package info, versions, dependencies, maintainers, and bulk package metadata lookups. Versions come newest first, the ${DEFAULT_VERSIONS_LIMIT} newest unless limit asks for more.`,
  inputSchema: z.discriminatedUnion("operation", [
    z.object({
      operation: z.literal("package"),
      purl: z.string().describe("Package PURL, for example pkg:npm/lodash or pkg:cargo/serde"),
    }),
    z.object({
      operation: z.literal("versions"),
      purl: z.string().describe("Package PURL, for example pkg:npm/lodash or pkg:cargo/serde"),
      limit: z
        .union([z.number().int().min(1), z.literal("all")])
        .optional()
        .describe(
          `How many of the newest versions to return, ${DEFAULT_VERSIONS_LIMIT} when absent. Pass "all" for the whole release history.`,
        ),
    }),
    z.object({
      operation: z.literal("dependencies"),
      purl: z
        .string()
        .describe("Package PURL including a version, for example pkg:pypi/flask@3.1.1"),
    }),
    z.object({
      operation: z.literal("maintainers"),
      purl: z
        .string()
        .describe("Package PURL, for example pkg:gem/rails or pkg:composer/laravel/framework"),
    }),
    z.object({
      operation: z.literal("bulk-packages"),
      purls: z.array(z.string()).min(1).max(50).describe("List of package PURLs to fetch in bulk."),
      concurrency: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe("Maximum concurrent lookups. Defaults to 15."),
    }),
  ]),
  execute: async (input, { abortSignal }) => {
    switch (input.operation) {
      case "package":
        return fetchPackageFromPURL(input.purl, abortSignal);
      case "versions":
        return fetchRecentVersions(input.purl, input.limit, abortSignal);
      case "dependencies":
        return fetchDependenciesFromPURL(input.purl, abortSignal);
      case "maintainers":
        return fetchMaintainersFromPURL(input.purl, abortSignal);
      case "bulk-packages": {
        const results = await bulkFetchPackages(input.purls, {
          concurrency: input.concurrency,
          signal: abortSignal,
        });
        return Object.fromEntries(results);
      }
    }
  },
});
