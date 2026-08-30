import { createServer } from "node:http";
import { Client } from "../../src/core/client.ts";
import { HTTPError } from "../../src/core/errors.ts";

describe("Client", () => {
  it("honors Retry-After without misclassifying server errors", async () => {
    let requests = 0;
    let responseStatus: number | null = 429;
    let retryAfter = "1";
    const server = createServer((_request, response) => {
      requests++;
      if (responseStatus !== null) {
        const status = responseStatus;
        responseStatus = null;
        response.writeHead(status, { Connection: "close", "Retry-After": retryAfter });
        response.end();
        return;
      }

      response.writeHead(200, { Connection: "close", "Content-Type": "application/json" });
      response.end('{"ok":true}');
    });

    await new Promise<void>((resolve, reject) => {
      const onError = (error: Readonly<Error>) => reject(error);
      server.once("error", onError);
      server.listen(0, "127.0.0.1", () => {
        server.off("error", onError);
        resolve();
      });
    });

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected TCP server address");
      const url = `http://127.0.0.1:${address.port}`;

      const startedAt = performance.now();
      await new Client({ maxRetries: 1, baseDelay: 10 }).getJSON(url);
      expect(performance.now() - startedAt).toBeGreaterThanOrEqual(900);
      expect(requests).toBe(2);

      responseStatus = 503;
      // 2_147_484 seconds converts to 2_147_484_000 ms, just above Node's timer ceiling.
      retryAfter = "2147484";
      const failure = new Client({ maxRetries: 1, baseDelay: 10 }).getJSON(url);
      await expect(failure).rejects.toMatchObject({
        name: HTTPError.name,
        statusCode: 503,
      });
      expect(requests).toBe(3);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
