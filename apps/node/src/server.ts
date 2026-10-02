import { createServer, type Server } from "node:http";
import { pathToFileURL } from "node:url";
import { render } from "@updf/core";
import { cmrFixture, createCmrDocument } from "@updf/example-cmr/cmr";

export function createCmrServer(): Server {
  const bytes = render(createCmrDocument(cmrFixture));
  return createServer((request, response) => {
    if (request.method !== "GET" || request.url !== "/cmr.pdf") {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "Content-Type": "application/pdf", "Content-Length": bytes.length });
    response.end(bytes);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createCmrServer().listen(3001, "127.0.0.1", () => console.log("http://127.0.0.1:3001/cmr.pdf"));
}
