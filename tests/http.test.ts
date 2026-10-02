import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fetch_text } from "../src/lib/http";
import { prefetch_imdb_ratings } from "../src/lib/parse";

let server: ReturnType<typeof Bun.serve>;
const attempts = new Map<string, number>();
beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch: (request) => {
      const path = new URL(request.url).pathname;
      const attempt = (attempts.get(path) ?? 0) + 1;
      attempts.set(path, attempt);
      if (path === "/ok" || (path === "/flaky" && attempt > 1)) return new Response("<html>ok</html>");
      if (path === "/missing") return new Response("<html>Not Found</html>", { status: 404, statusText: "Not Found" });
      return new Response("<html>Gateway Timeout</html>", { status: 504, statusText: "Gateway Timeout" });
    },
  });
});
afterAll(() => server.stop(true));

describe("fetch_text", () => {
  test("returns the body of a successful response", async () => {
    expect(await fetch_text(new URL("/ok", server.url).href)).toBe("<html>ok</html>");
  });

  test("rejects error pages instead of returning them as content", async () => {
    expect(fetch_text(new URL("/down", server.url).href, undefined, { retry_delay_ms: 1 })).rejects.toThrow("504");
  });

  test("retries a transient server error", async () => {
    expect(await fetch_text(new URL("/flaky", server.url).href, undefined, { retry_delay_ms: 1 })).toBe("<html>ok</html>");
    expect(attempts.get("/flaky")).toBe(2);
  });

  test("does not retry client errors", async () => {
    expect(fetch_text(new URL("/missing", server.url).href, undefined, { retry_delay_ms: 1 })).rejects.toThrow("404");
    await Bun.sleep(10);
    expect(attempts.get("/missing")).toBe(1);
  });
});

describe("prefetch_imdb_ratings", () => {
  test("treats an unavailable ratings dataset as no ratings", async () => {
    const ratings = await prefetch_imdb_ratings(new URL("/down", server.url).href)(["tt0111161"]);
    expect(ratings.size).toBe(0);
  });
});
