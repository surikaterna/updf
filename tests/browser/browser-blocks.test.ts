import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";
import { preview } from "vite";
import { blockProof, containerProof } from "../../apps/browser-fonts/block-proof.js";

test("public external chart adapter has exact Node/Chromium fragment, placement and PDF byte parity", async () => {
  const server = await preview({
    configFile: new URL("../../apps/browser-fonts/vite.config.ts", import.meta.url).pathname,
    preview: { host: "127.0.0.1", port: 0 },
  });
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_CHROMIUM ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    const url = server.resolvedUrls?.local[0];
    assert.ok(url);
    await page.goto(url);
    const link = page.getByRole("link", { name: "Download external chart proof" });
    await link.waitFor();
    const bytes = await link.evaluate(async (element) => {
      if (!(element instanceof HTMLAnchorElement)) throw new Error("Expected link");
      return Array.from(new Uint8Array(await (await fetch(element.href)).arrayBuffer()));
    });
    const expected = blockProof();
    assert.equal(expected.result.pageCount, 2);
    assert.deepEqual(new Uint8Array(bytes), expected.bytes);
    assert.equal(await page.locator("#external-chart-result").textContent(), JSON.stringify(expected.result));
    const clip = page.getByRole("link", { name: "Download container clip proof" });
    const clipBytes = await clip.evaluate(async (element) => {
      if (!(element instanceof HTMLAnchorElement)) throw new Error("Expected link");
      return Array.from(new Uint8Array(await (await fetch(element.href)).arrayBuffer()));
    });
    const contained = containerProof();
    assert.equal(contained.result.pageCount, 1);
    assert.deepEqual(new Uint8Array(clipBytes), contained.bytes);
    assert.equal(await page.locator("#container-clip-result").textContent(), JSON.stringify(contained.result));
  } finally {
    await browser.close();
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
  }
});
