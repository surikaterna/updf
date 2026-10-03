import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { prepareFont } from "@updf/fontkit";
import { chromium } from "playwright";
import { preview } from "vite";
import { richProof } from "../../apps/browser-fonts/rich-proof.js";

test("Chromium and Node rich prepared-font measurement data and PDF bytes agree exactly", async () => {
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
    const link = page.getByRole("link", { name: "Download rich font proof" });
    await link.waitFor();
    const bytes = await link.evaluate(async (element) => {
      if (!(element instanceof HTMLAnchorElement)) throw new Error("Expected link");
      return Array.from(new Uint8Array(await (await fetch(element.href)).arrayBuffer()));
    });
    const font = prepareFont(
      new Uint8Array(await readFile(new URL("../fixtures/fonts/LiberationSans-Regular.ttf", import.meta.url))),
    );
    const expected = richProof(font);
    assert.deepEqual(new Uint8Array(bytes), expected.bytes);
    assert.equal(await page.locator("#rich-measurement").textContent(), JSON.stringify(expected.measurement));
  } finally {
    await browser.close();
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
  }
});
