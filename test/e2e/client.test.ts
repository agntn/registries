import { createServer } from "node:http";
import { Client } from "../../src/core/client.ts";

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

    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => reject(error);
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
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
