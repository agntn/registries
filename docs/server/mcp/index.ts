import { serverInfo } from "../../../src/server-info.ts";

/** Introduces itself like `registries mcp`, with the Docus page tools beside the registry ones. */
export default defineMcpHandler({ ...serverInfo });
