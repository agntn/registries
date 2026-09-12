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

  describe("against a server that never answers", () => {
    let requests = 0;
    let url = "";
    const server = createServer(() => {
      requests++;
    });

    beforeAll(async () => {
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected TCP server address");
      url = `http://127.0.0.1:${address.port}`;
    });

    afterAll(async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    });

    beforeEach(() => {
      requests = 0;
    });

    async function settle(request: Readonly<Promise<unknown>>, within: number): Promise<unknown> {
      return Promise.race([
        request.then(
          () => "resolved",
          (error: unknown) => error,
        ),
        new Promise((resolve) => setTimeout(() => resolve("still pending"), within)),
      ]);
    }

    it("keeps the timeout while a caller signal stays active", async () => {
      const controller = new AbortController();
      const client = new Client({ timeout: 50, maxRetries: 1, baseDelay: 10 });

      const outcome = await settle(client.getJSON(url, controller.signal), 1000);

      expect(outcome).toMatchObject({ name: HTTPError.name, statusCode: 0 });
      expect(controller.signal.aborted).toBe(false);
      expect(requests).toBe(1);
    });

    it("stops retrying once the caller aborts", async () => {
      const controller = new AbortController();
      const client = new Client({ maxRetries: 5, baseDelay: 50 });
      setTimeout(() => controller.abort(), 20);

      const outcome = await settle(client.getJSON(url, controller.signal), 500);

      expect(outcome).toMatchObject({ name: HTTPError.name, statusCode: 0 });
      expect(requests).toBe(1);
    });
  });
});
