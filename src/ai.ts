import { toAiTool } from "@agntn/tools/ai";
import { registriesTools } from "./tools.ts";

const [pkg, versions, dependencies, maintainers, bulkPackages, ecosystems] = registriesTools();

/** `registries_package` for the AI SDK: the model reads the JSON, your code reads the package. */
export const packageTool = toAiTool(pkg);

/** `registries_versions` for the AI SDK, newest first, with the count of the ones left out. */
export const versionsTool = toAiTool(versions);

/** `registries_dependencies` for the AI SDK, under `dependencies`. */
export const dependenciesTool = toAiTool(dependencies);

/** `registries_maintainers` for the AI SDK, under `maintainers`. */
export const maintainersTool = toAiTool(maintainers);

/** `registries_bulk_packages` for the AI SDK, one package per PURL that answered. */
export const bulkPackagesTool = toAiTool(bulkPackages);

/** `registries_ecosystems` for the AI SDK, under `ecosystems`. */
export const ecosystemsTool = toAiTool(ecosystems);
