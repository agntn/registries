import packageJSON from "../package.json" with { type: "json" };

export const version = packageJSON.version;
