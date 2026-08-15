import type { Version } from "../../src/core/types.ts";
import { selectRecentVersions } from "../../src/commands/versions.ts";

function createVersion(number: string, publishedAt: string | null): Version {
  return {
    number,
    publishedAt: publishedAt ? new Date(publishedAt) : null,
    licenses: "",
    integrity: "",
    status: "",
    metadata: {},
  };
}

describe("selectRecentVersions", () => {
  it("limits versions after sorting by recency and keeps undated versions last", () => {
    const versions = [
      createVersion("1.0.0", "2022-01-01T00:00:00Z"),
      createVersion("unknown-a", null),
      createVersion("3.0.0", "2024-01-01T00:00:00Z"),
      createVersion("2.0.0", "2023-01-01T00:00:00Z"),
      createVersion("unknown-b", null),
    ];

    expect(selectRecentVersions(versions, 3).map(({ number }) => number)).toEqual([
      "3.0.0",
      "2.0.0",
      "1.0.0",
    ]);
    expect(selectRecentVersions(versions, 5).map(({ number }) => number)).toEqual([
      "3.0.0",
      "2.0.0",
      "1.0.0",
      "unknown-a",
      "unknown-b",
    ]);
    expect(versions.map(({ number }) => number)).toEqual([
      "1.0.0",
      "unknown-a",
      "3.0.0",
      "2.0.0",
      "unknown-b",
    ]);
  });
});
