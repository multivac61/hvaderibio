import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fetch_text } from "../src/lib/http";
import { fetch_imdb_ratings } from "../src/lib/parse";

let server: ReturnType<typeof Bun.serve>;
beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch: (request) =>
      new URL(request.url).pathname === "/ok"
        ? new Response("<html>ok</html>")
        : new Response("<html>Service Unavailable</html>", { status: 503, statusText: "Service Unavailable" }),
  });
});
afterAll(() => server.stop(true));

describe("fetch_text", () => {
  test("returns the body of a successful response", async () => {
    expect(await fetch_text(new URL("/ok", server.url).href)).toBe("<html>ok</html>");
  });

  test("rejects error pages instead of returning them as content", async () => {
    expect(fetch_text(new URL("/down", server.url).href)).rejects.toThrow("503");
  });
});

describe("fetch_imdb_ratings", () => {
  test("treats an unavailable ratings dataset as no ratings", async () => {
    const ratings = await fetch_imdb_ratings(["tt0111161"], new URL("/down", server.url).href);
    expect(ratings.size).toBe(0);
  });
});
