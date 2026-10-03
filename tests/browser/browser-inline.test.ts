import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";
import { preview } from "vite";
import { inlineProof } from "../../apps/browser-fonts/inline-proof.js";
import { fixtureFont } from "../fixtures/fonts/font-fixture.js";

test("D: prepared Paragraph/Span, provider, native badge and local SVG adapter have exact Node/Chromium bytes and metrics", async () => {
  const server = await preview({
    configFile: new URL("../../apps/browser-fonts/vite.config.ts", import.meta.url).pathname,
    preview: { host: "127.0.0.1", port: 0 },
  });
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    const url = server.resolvedUrls?.local[0];
    assert.ok(url);
    await page.goto(url);
    const link = page.getByRole("link", { name: "Download inline paragraph proof" });
    await link.waitFor();
    const bytes = await link.evaluate(async (element) => {
      if (!(element instanceof HTMLAnchorElement)) throw new Error("Expected link");
      return Array.from(new Uint8Array(await (await fetch(element.href)).arrayBuffer()));
    });
    const expected = inlineProof(await fixtureFont());
    assert.deepEqual(new Uint8Array(bytes), expected.bytes);
    assert.equal(await page.locator("#inline-measurement").textContent(), JSON.stringify(expected.measurement));
  } finally {
    await browser.close();
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
  }
});
