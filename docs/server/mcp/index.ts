import { toToolkitTools } from "@agntn/tools/toolkit";
import { getMcpTools } from "@nuxtjs/mcp-toolkit/server";
import { serverInfo } from "../../../src/server-info.ts";
import { siteTools } from "../utils/registries-mcp";

const registryTools = toToolkitTools(serverInfo, siteTools());

/** Introduces itself like `registries mcp`, and serves its tools after the Docus page tools. */
export default defineMcpHandler({
  ...serverInfo,
  tools: async (event) => [...(await getMcpTools({ event })), ...registryTools],
});
