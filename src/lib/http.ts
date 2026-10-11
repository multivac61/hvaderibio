import { setTimeout as sleep } from "node:timers/promises";

/**
 * Fetch a page's text, rejecting non-2xx responses. Parsing an error page as
 * content would silently publish an empty or partial catalog.
 *
 * Server errors (5xx) and failed connections are retried with a growing
 * delay: kvikmyndir.is occasionally answers a listing with 504 Gateway
 * Timeout or lets a connection attempt time out, and failing the whole
 * scrape on one would delay the update by an hour.
 */
export async function fetch_text(
  url: string,
  init?: RequestInit,
  { retries = 2, retry_delay_ms = 2000 }: { retries?: number; retry_delay_ms?: number } = {}
): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    // fetch rejects only when no response arrived at all.
    const response = await fetch(url, init).catch((error: unknown) => {
      if (attempt >= retries) throw error;
      return null;
    });
    if (response?.ok) return response.text();

    if (response && (response.status < 500 || attempt >= retries)) {
      throw new Error(`${response.status} ${response.statusText} from ${url}`);
    }
    await sleep(retry_delay_ms * (attempt + 1));
  }
}
