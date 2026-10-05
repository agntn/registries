import { Client, parseRetryAfter, retryDelayFor } from "../../src/core/client.ts";
import { HTTPError, RateLimitError } from "../../src/core/errors.ts";
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
    fetch.mockReset();
    fetch.mockImplementation(async () => Response.json({}));
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

  it("should let a caller header replace a default in any letter case", async () => {
    await new Client().getJSON("https://registry.example/pkg", undefined, {
      accept: "application/vnd.pypi.simple.v1+json",
    });

    const sent = new Headers(fetch.mock.calls[0]?.[1]?.headers);
    expect(sent.get("Accept")).toBe("application/vnd.pypi.simple.v1+json");
    expect(sent.get("User-Agent")).toContain("agntn-registries/");
  });

  it("should reject a malformed caller header before any request", async () => {
    const failure = new Client({ baseDelay: 1 }).getJSON(
      "https://registry.example/pkg",
      undefined,
      {
        "X-Note": "line\nbreak",
      },
    );

    await expect(failure).rejects.toBeInstanceOf(TypeError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("should decode JSON and leave a bodiless response undefined", async () => {
    fetch
      .mockResolvedValueOnce(Response.json({ name: "lodash" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(""))
      .mockResolvedValueOnce(new Response("not json"));
    const client = new Client();

    await expect(client.getJSON("https://registry.example/a")).resolves.toEqual({ name: "lodash" });
    await expect(client.getJSON("https://registry.example/b")).resolves.toBeUndefined();
    await expect(client.getJSON("https://registry.example/c")).resolves.toBe("");
    await expect(client.getJSON("https://registry.example/d")).resolves.toBe("not json");
  });

  it("should drop prototype keys from a decoded body", async () => {
    fetch.mockResolvedValueOnce(
      new Response('{"__proto__":{"polluted":true},"ok":1}', {
        headers: { "Content-Type": "application/json" },
      }),
    );

    const data = await new Client().getJSON<Record<string, unknown>>("https://registry.example/a");

    expect(data).toEqual({ ok: 1 });
    expect(Object.getPrototypeOf(data)).toBe(Object.prototype);
  });

  it("should turn a 404 into HTTPError without retrying", async () => {
    fetch.mockResolvedValueOnce(new Response("Not Found", { status: 404 }));

    const failure = new Client({ baseDelay: 1 }).getJSON("https://registry.example/missing");

    await expect(failure).rejects.toBeInstanceOf(HTTPError);
    await expect(failure).rejects.toMatchObject({
      statusCode: 404,
      url: "https://registry.example/missing",
      body: "Not Found",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("should retry a server error and return the recovered body", async () => {
    fetch
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response("", { status: 502 }))
      .mockResolvedValueOnce(Response.json({ ok: true }));

    await expect(
      new Client({ maxRetries: 2, baseDelay: 1 }).getJSON("https://registry.example/a"),
    ).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("should give each attempt its own timeout signal", async () => {
    fetch.mockResolvedValueOnce(new Response("", { status: 500 }));

    await new Client({ maxRetries: 1, baseDelay: 1 }).getJSON("https://registry.example/a");

    const [first, second] = fetch.mock.calls.map((call) => call[1]?.signal);
    expect(first).toBeInstanceOf(AbortSignal);
    expect(second).toBeInstanceOf(AbortSignal);
    expect(second).not.toBe(first);
  });

  it("should throw the last HTTPError once retries run out", async () => {
    fetch.mockImplementation(async () => new Response("down", { status: 503 }));

    const failure = new Client({ maxRetries: 2, baseDelay: 1 }).getJSON(
      "https://registry.example/a",
    );

    await expect(failure).rejects.toMatchObject({
      name: "HTTPError",
      statusCode: 503,
      body: "down",
    });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("should retry a dropped connection and report it as status 0", async () => {
    fetch.mockRejectedValue(new TypeError("fetch failed"));

    const failure = new Client({ maxRetries: 1, baseDelay: 1 }).getJSON(
      "https://registry.example/a",
    );

    await expect(failure).rejects.toMatchObject({ name: "HTTPError", statusCode: 0 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("should keep Retry-After on an exhausted 429", async () => {
    fetch.mockImplementation(
      async () => new Response("", { status: 429, headers: { "Retry-After": "0" } }),
    );

    const failure = new Client({ maxRetries: 1, baseDelay: 1 }).getJSON(
      "https://registry.example/a",
    );

    await expect(failure).rejects.toBeInstanceOf(RateLimitError);
    await expect(failure).rejects.toMatchObject({ retryAfter: 0 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("should reject a 429 whose Retry-After no timer can hold", async () => {
    fetch.mockResolvedValueOnce(
      new Response("", { status: 429, headers: { "Retry-After": "2147484" } }),
    );

    const failure = new Client({ maxRetries: 3, baseDelay: 1 }).getJSON(
      "https://registry.example/a",
    );

    await expect(failure).rejects.toMatchObject({ name: "RateLimitError", retryAfter: 2_147_484 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("should stop waiting out a Retry-After when the caller aborts", async () => {
    fetch.mockImplementation(async (_input, init) => {
      init?.signal?.throwIfAborted();
      return new Response("", { status: 503, headers: { "Retry-After": "5" } });
    });
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20);
    const startedAt = performance.now();

    const failure = new Client({ maxRetries: 1, baseDelay: 1 }).getJSON(
      "https://registry.example/a",
      controller.signal,
    );

    await expect(failure).rejects.toMatchObject({ name: "HTTPError", statusCode: 0 });
    expect(performance.now() - startedAt).toBeLessThan(1000);
  });
});
