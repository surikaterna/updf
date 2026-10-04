import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import test from "node:test";
import { render } from "@updf/core";
import { cmrFixture, createCmrDocument } from "@updf/example-cmr/cmr";
import { chromium } from "playwright";
import { preview } from "vite";
import { createCmrServer } from "../../apps/node/src/server.js";

function endpointUrl(server: ReturnType<typeof createCmrServer>): string {
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}/cmr.pdf`;
}

test("production React in Chromium generates identical Node/HTTP PDF bytes", async () => {
  const server = await preview({
    configFile: new URL("../../apps/browser-react/vite.config.ts", import.meta.url).pathname,
    preview: { host: "127.0.0.1", port: 0 },
  });
  const endpoint = createCmrServer();
  await new Promise<void>((resolve) => endpoint.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_CHROMIUM ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const url = server.resolvedUrls?.local[0];
    assert.ok(url);
    await page.goto(url);
    const link = page.getByRole("link", { name: "Download CMR PDF" });
    await link.waitFor();
    const bytes = await link.evaluate(async (element) => {
      if (!(element instanceof HTMLAnchorElement)) throw new Error("Expected download anchor");
      return Array.from(new Uint8Array(await (await fetch(element.href)).arrayBuffer()));
    });
    const expected = render(createCmrDocument(cmrFixture));
    assert.deepEqual(new Uint8Array(bytes), expected);
    assert.equal(await page.evaluate(() => typeof Buffer), "undefined");
    assert.equal(await page.evaluate(() => typeof process), "undefined");
    const response = await fetch(endpointUrl(endpoint));
    assert.equal(response.headers.get("content-type"), "application/pdf");
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), expected);
    assert.equal((await fetch(endpointUrl(endpoint), { method: "POST" })).status, 404);
    assert.deepEqual(errors, []);
    await mkdir(new URL("../../artifacts/", import.meta.url), { recursive: true });
    const downloadEvent = page.waitForEvent("download");
    await link.click();
    const download = await downloadEvent;
    await download.saveAs(new URL("../../artifacts/browser.pdf", import.meta.url).pathname);
    const path = await download.path();
    assert.ok(path);
    assert.deepEqual(new Uint8Array(await readFile(path)), expected);
    await page.screenshot({ path: new URL("../../artifacts/browser.png", import.meta.url).pathname, fullPage: true });
  } finally {
    await browser.close();
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
    await new Promise<void>((resolve) => endpoint.close(() => resolve()));
  }
});
