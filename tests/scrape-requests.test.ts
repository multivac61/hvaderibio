import { expect, test } from "bun:test";
import { create_page_fetcher, map_concurrent } from "../src/lib/scrape-requests";

test("requests to one host are spaced and wait for the previous response body", async () => {
  let active = 0;
  let maximum = 0;
  const starts: number[] = [];
  const server = Bun.serve({
    port: 0,
    fetch() {
      starts.push(performance.now());
      maximum = Math.max(maximum, ++active);
      return new Response(
        new ReadableStream({
          async start(controller) {
            controller.enqueue(new TextEncoder().encode("first"));
            await Bun.sleep(40);
            active--;
            controller.enqueue(new TextEncoder().encode("last"));
            controller.close();
          },
        })
      );
    },
  });
  try {
    const fetchPage = create_page_fetcher({ intervalMs: 70 });
    const responses = await Promise.all([1, 2, 3].map(() => fetchPage(server.url.href)));
    expect(await Promise.all(responses.map((response) => response.text()))).toEqual(["firstlast", "firstlast", "firstlast"]);
    expect(maximum).toBe(1);
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(55);
    expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(55);
  } finally {
    server.stop(true);
  }
});

test("an aborted request does not block later requests, including redirects", async () => {
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      return new URL(request.url).pathname === "/redirect"
        ? new Response(null, { status: 302, headers: { location: "/result" } })
        : new Response("recovered");
    },
  });
  try {
    const fetchPage = create_page_fetcher({ intervalMs: 0 });
    await expect(fetchPage(server.url.href, { signal: AbortSignal.abort() })).rejects.toThrow();
    expect(await (await fetchPage(new URL("redirect", server.url))).text()).toBe("recovered");
  } finally {
    server.stop(true);
  }
});

test("parallel work stays bounded and results keep input order", async () => {
  let active = 0;
  let maximum = 0;
  const result = await map_concurrent([50, 10, 30, 5], 2, async (delay) => {
    maximum = Math.max(maximum, ++active);
    await Bun.sleep(delay);
    active--;
    return delay * 2;
  });
  expect(result).toEqual([100, 20, 60, 10]);
  expect(maximum).toBe(2);
});
