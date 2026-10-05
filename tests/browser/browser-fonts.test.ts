import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import test from "node:test";
import { renderUnicodeCMR } from "@updf/example-cmr/cmr-unicode";
import { prepareFont } from "@updf/fontkit";
import { chromium } from "playwright";
import { preview } from "vite";

test("actual Chromium public Fontkit browser export prepares Unicode CMR exactly like Node", async () => {
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
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const url = server.resolvedUrls?.local[0];
    assert.ok(url);
    await page.goto(url);
    const link = page.getByRole("link", { name: "Download Unicode CMR PDF" });
    await link.waitFor();
    const bytes = await link.evaluate(async (element) => {
      if (!(element instanceof HTMLAnchorElement)) throw new Error("Expected download link");
      return Array.from(new Uint8Array(await (await fetch(element.href)).arrayBuffer()));
    });
    const font = prepareFont(
      new Uint8Array(await readFile(new URL("../fixtures/fonts/LiberationSans-Regular.ttf", import.meta.url))),
    );
    const expected = renderUnicodeCMR(font);
    assert.deepEqual(new Uint8Array(bytes), expected);
    assert.equal(await page.evaluate(() => typeof Buffer), "undefined");
    assert.equal(await page.evaluate(() => typeof process), "undefined");
    assert.deepEqual(errors, []);
    const artifacts = new URL("../../artifacts/", import.meta.url);
    await mkdir(artifacts, { recursive: true });
    const pending = page.waitForEvent("download");
    await link.click();
    const download = await pending;
    await download.saveAs(new URL("cmr-unicode-browser.pdf", artifacts).pathname);
    const path = await download.path();
    assert.ok(path);
    assert.deepEqual(new Uint8Array(await readFile(path)), expected);
    await page.screenshot({ path: new URL("font-browser.png", artifacts).pathname, fullPage: true });
  } finally {
    await browser.close();
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
  }
});
