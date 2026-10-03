import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { prepareFont } from "@updf/fontkit";
import { chromium } from "playwright";
import { preview } from "vite";
import { mixedProof } from "../../apps/browser-fonts/mixed-proof.js";

test("Node/Chromium mixed sections, final scoped page/fragment contexts and prepared PDF bytes agree", async () => {
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
    await page.locator("#mixed-proof").waitFor({ state: "attached" });
    const font = prepareFont(
      new Uint8Array(await readFile(new URL("../fixtures/fonts/LiberationSans-Regular.ttf", import.meta.url))),
    );
    const expected = mixedProof(font);
    assert.ok(expected.pageCount >= 5);
    assert.ok(expected.fragments.length >= 3);
    assert.equal(await page.locator("#mixed-proof").textContent(), JSON.stringify(expected));
  } finally {
    await browser.close();
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
  }
});
