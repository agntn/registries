import { failureLines } from "../../src/commands/shared.ts";
import { HTTPError, InvalidPURLError, RateLimitError } from "../../src/core/errors.ts";

describe("failureLines", () => {
  it("should print a clean message for RateLimitError", () => {
    expect(failureLines(new RateLimitError(120))).toEqual([
      "Rate limited by registry. Retry after 120s",
    ]);
  });

  it("should print a clean message for HTTPError", () => {
    expect(
      failureLines(new HTTPError(403, "https://registry.npmjs.org/lodash", "Forbidden")),
    ).toEqual(["Registry request failed: HTTP 403 (https://registry.npmjs.org/lodash)"]);
  });

  it("should suggest retrying later for server errors", () => {
    expect(
      failureLines(new HTTPError(503, "https://registry.npmjs.org/lodash", "Service Unavailable")),
    ).toEqual([
      "Registry request failed: HTTP 503 (https://registry.npmjs.org/lodash)",
      "The registry may be temporarily unavailable. Try again later.",
    ]);
  });

  it("should rethrow unknown errors", () => {
    expect(() => failureLines(new TypeError("something unexpected"))).toThrow(
      "something unexpected",
    );
  });

  it("should keep an echoed PURL on its own line", () => {
    expect(
      failureLines(new InvalidPURLError("pkg:npm/a\nPackage not found: npm/b", "bad")),
    ).toEqual([
      "Invalid PURL: pkg:npm/a Package not found: npm/b",
      "Examples: pkg:npm/lodash, npm/lodash@4.17.21, pkg:cargo/serde",
    ]);
  });
});
