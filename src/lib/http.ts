/**
 * Fetch a page's text, rejecting non-2xx responses. Parsing an error page as
 * content would silently publish an empty or partial catalog.
 */
export async function fetch_text(url: string, init?: RequestInit): Promise<string> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} from ${url}`);
  }
  return response.text();
}
