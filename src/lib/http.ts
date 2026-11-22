import { setTimeout as sleep } from "node:timers/promises";

export type FetchRetryOptions = {
  retries?: number;
  retry_delay_ms?: number;
  timeout_ms?: number;
};

/**
 * Fetch a URL, rejecting non-2xx responses and aborting stalled requests
 * after `timeout_ms`.
 *
 * Server errors (5xx), timeouts, and failed connections are retried with a
 * growing delay: kvikmyndir.is occasionally answers a listing with 504
 * Gateway Timeout or lets a connection attempt time out, and failing the
 * whole scrape on one would delay the update by an hour.
 */
export async function fetch_with_retry(
  url: string,
  init?: RequestInit,
  { retries = 2, retry_delay_ms = 2000, timeout_ms = 15_000 }: FetchRetryOptions = {}
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const timeout = AbortSignal.timeout(timeout_ms);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    // fetch rejects when no response arrived at all (network error or timeout).
    const response = await fetch(url, { ...init, signal }).catch((error: unknown) => {
      if (attempt >= retries) throw error;
      return null;
    });
    if (response?.ok) return response;

    if (response && (response.status < 500 || attempt >= retries)) {
      throw new Error(`${response.status} ${response.statusText} from ${url}`);
    }
    await sleep(retry_delay_ms * (attempt + 1));
  }
}

/**
 * Fetch a page's text, rejecting non-2xx responses. Parsing an error page as
 * content would silently publish an empty or partial catalog.
 */
export async function fetch_text(url: string, init?: RequestInit, options?: FetchRetryOptions): Promise<string> {
  const response = await fetch_with_retry(url, init, options);
  return response.text();
}
