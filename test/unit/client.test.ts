import { Client, parseRetryAfter, retryDelayFor } from "../../src/core/client.ts";
import { RateLimitError } from "../../src/core/errors.ts";
import { version } from "../../src/version.ts";

describe("parseRetryAfter", () => {
  it("parses numeric seconds", () => {
    expect(parseRetryAfter("120")).toBe(120);
  });

  it("parses zero", () => {
    expect(parseRetryAfter("0")).toBe(0);
  });

  it("returns 60 for null", () => {
    expect(parseRetryAfter(null)).toBe(60);
  });

  it("returns 60 for undefined", () => {
    expect(parseRetryAfter(undefined)).toBe(60);
  });

  it("returns 60 for empty string", () => {
    expect(parseRetryAfter("")).toBe(60);
  });

  it("parses HTTP-date in the future", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
      const result = parseRetryAfter("Wed, 01 Jan 2025 00:01:30 GMT");
      expect(result).toBe(90);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns 0 for HTTP-date in the past", () => {
    expect(parseRetryAfter("Wed, 21 Oct 2015 07:28:00 GMT")).toBe(0);
  });

  it("returns 60 for garbage input", () => {
    expect(parseRetryAfter("not-a-number-or-date")).toBe(60);
  });

  it("handles large numeric values", () => {
    expect(parseRetryAfter("3600")).toBe(3600);
  });

  it("treats leading zeros as decimal", () => {
    expect(parseRetryAfter("0120")).toBe(120);
  });

  it("rejects partial numeric like '120s'", () => {
    expect(parseRetryAfter("120s")).toBe(60);
  });

  it("rejects decimal like '1.5'", () => {
    expect(parseRetryAfter("1.5")).toBe(60);
  });

  it("returns 60 for whitespace-only", () => {
    expect(parseRetryAfter("   ")).toBe(60);
  });
});

describe("retryDelayFor", () => {
  it("falls back for invalid values", () => {
    expect(retryDelayFor("not-a-delay", 75)).toBe(75);
  });

  it("keeps a longer local backoff", () => {
    expect(retryDelayFor("0", 75)).toBe(75);
  });

  it("rejects values above the timer limit", () => {
    // Node timers accept at most 2_147_483_647 ms, so these straddle that ceiling in seconds.
    expect(retryDelayFor("2147483", 10)).toBe(2_147_483_000);
    expect(() => retryDelayFor("2147484", 10)).toThrow(RateLimitError);
  });
});

describe("Client", () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json({}));

  beforeEach(() => {
    fetch.mockClear();
    vi.stubGlobal("fetch", fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function sentUserAgent(): string | null {
    const init = fetch.mock.calls[0]?.[1];
    return new Headers(init?.headers).get("User-Agent");
  }

  it("should identify the installed release in the default User-Agent", async () => {
    await new Client().getJSON("https://registry.example/pkg");

    expect(sentUserAgent()).toBe(
      `agntn-registries/${version} (+https://github.com/agntn/registries)`,
    );
  });

  it("should send a caller-supplied User-Agent unchanged", async () => {
    await new Client({ userAgent: "my-tool/1.0" }).getJSON("https://registry.example/pkg");

    expect(sentUserAgent()).toBe("my-tool/1.0");
  });
});
