import { createServer } from "node:http";
import { Client, parseRetryAfter } from "../../src/core/client.ts";

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

describe("Client", () => {
  it("waits for Retry-After before retrying a 429 response", async () => {
    let requests = 0;
    const server = createServer((_request, response) => {
      requests++;
      if (requests === 1) {
        response.writeHead(429, { Connection: "close", "Retry-After": "1" });
        response.end();
        return;
      }

      response.writeHead(200, { Connection: "close", "Content-Type": "application/json" });
      response.end('{"ok":true}');
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected TCP server address");

      const startedAt = performance.now();
      await new Client({ maxRetries: 1, baseDelay: 10 }).getJSON(
        `http://127.0.0.1:${address.port}`,
      );

      expect(performance.now() - startedAt).toBeGreaterThanOrEqual(900);
      expect(requests).toBe(2);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
