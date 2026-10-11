import { createServer, type AddressInfo } from "node:net";
import { setTimeout as sleep } from "timers/promises";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { fetch_text } from "../src/lib/http";
import { prefetch_imdb_ratings } from "../src/lib/parse";
import { serve, type TestServer } from "./serve";

let server: TestServer;
const attempts = new Map<string, number>();
beforeAll(async () => {
  server = await serve((request) => {
    const path = new URL(request.url).pathname;
    const attempt = (attempts.get(path) ?? 0) + 1;
    attempts.set(path, attempt);
    if (path === "/ok" || (path === "/flaky" && attempt > 1)) return new Response("<html>ok</html>");
    if (path === "/missing") return new Response("<html>Not Found</html>", { status: 404, statusText: "Not Found" });
    return new Response("<html>Gateway Timeout</html>", { status: 504, statusText: "Gateway Timeout" });
  });
});
afterAll(() => server.close());

describe("fetch_text", () => {
  test("returns the body of a successful response", async () => {
    expect(await fetch_text(new URL("/ok", server.url).href)).toBe("<html>ok</html>");
  });

  test("rejects error pages instead of returning them as content", async () => {
    await expect(fetch_text(new URL("/down", server.url).href, undefined, { retry_delay_ms: 1 })).rejects.toThrow("504");
  });

  test("retries a transient server error", async () => {
    expect(await fetch_text(new URL("/flaky", server.url).href, undefined, { retry_delay_ms: 1 })).toBe("<html>ok</html>");
    expect(attempts.get("/flaky")).toBe(2);
  });

  test("retries a dropped connection", async () => {
    // A server that hangs up on the first connection, as a connect timeout
    // or reset would, and answers the next one.
    let connections = 0;
    const flaky = createServer((socket) => {
      if (++connections === 1) return socket.destroy();
      socket.end("HTTP/1.1 200 OK\r\nContent-Length: 15\r\nConnection: close\r\n\r\n<html>ok</html>");
    });
    await new Promise<void>((resolve) => flaky.listen(0, "127.0.0.1", resolve));
    try {
      const { port } = flaky.address() as AddressInfo;
      expect(await fetch_text(`http://127.0.0.1:${port}/`, undefined, { retry_delay_ms: 1 })).toBe("<html>ok</html>");
      expect(connections).toBe(2);
    } finally {
      flaky.close();
    }
  });

  test("does not retry client errors", async () => {
    await expect(fetch_text(new URL("/missing", server.url).href, undefined, { retry_delay_ms: 1 })).rejects.toThrow("404");
    await sleep(10);
    expect(attempts.get("/missing")).toBe(1);
  });
});

describe("prefetch_imdb_ratings", () => {
  test("treats an unavailable ratings dataset as no ratings", async () => {
    const ratings = await prefetch_imdb_ratings(new URL("/down", server.url).href)(["tt0111161"]);
    expect(ratings.size).toBe(0);
  });
});
