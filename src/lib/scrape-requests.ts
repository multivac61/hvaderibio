// Hold each host's slot until the body is read, not just until headers arrive.
// This fetcher is for bounded HTML/image responses; large datasets stream separately.
export function create_page_fetcher({ intervalMs = 200, timeoutMs = 30_000 } = {}) {
  const hosts = new Map<string, { tail: Promise<void>; nextStart: number }>();

  return async function fetchPage(input: string | URL, init: RequestInit = {}): Promise<Response> {
    let url = new URL(input);
    const headers = new Headers(init.headers);
    for (let redirects = 0; redirects <= 20; redirects++) {
      let host = hosts.get(url.hostname);
      if (!host) {
        host = { tail: Promise.resolve(), nextStart: 0 };
        hosts.set(url.hostname, host);
      }
      const state = host;
      const currentUrl = url;
      const pending = state.tail.then(async () => {
        await Bun.sleep(Math.max(0, state.nextStart - performance.now()));
        state.nextStart = performance.now() + intervalMs;
        const timeout = AbortSignal.timeout(timeoutMs);
        const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
        const response = await fetch(currentUrl, { ...init, headers, redirect: "manual", signal });
        const bytes = await response.arrayBuffer();
        return new Response([204, 205, 304].includes(response.status) ? null : bytes, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      });
      state.tail = pending.then(
        () => {},
        () => {}
      );
      const response = await pending;
      const location = response.headers.get("location");
      if (![301, 302, 303, 307, 308].includes(response.status) || !location) return response;
      const next = new URL(location, url);
      if (next.origin !== url.origin) {
        headers.delete("authorization");
        headers.delete("cookie");
      }
      url = next;
    }
    throw new Error(`Too many redirects: ${input}`);
  };
}

export const fetch_page = create_page_fetcher();

export async function map_concurrent<T, R>(items: readonly T[], concurrency: number, work: (item: T) => Promise<R>): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error("Concurrency must be a positive integer");
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await work(items[index]);
      }
    })
  );
  return results;
}
