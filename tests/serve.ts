import { createServer } from "http";
import type { AddressInfo } from "net";

export type TestServer = { url: URL; close: () => Promise<void> };

/**
 * Serve `handler` on an ephemeral localhost port, so code under test can
 * fetch real HTTP responses without reaching the network.
 */
export async function serve(handler: (request: Request) => Response | Promise<Response>): Promise<TestServer> {
  const server = createServer(async (req, res) => {
    const response = await handler(new Request(new URL(req.url ?? "/", "http://localhost"), { method: req.method }));
    res.writeHead(response.status, response.statusText, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: new URL(`http://127.0.0.1:${port}/`),
    close: () =>
      new Promise((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
