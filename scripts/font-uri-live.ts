import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createAssetLoader } from "@updf/assets";
import { loadFont } from "@updf/fontkit/load";
import { chromium } from "playwright";
import { googleFontUri } from "../apps/showcase/src/font-uri-controls.js";
import { fontUriExample } from "../apps/showcase/src/font-uri.js";

const loader = createAssetLoader({
  fetch: globalThis.fetch,
  allowUri: (uri) => new URL(uri).origin === "https://fonts.gstatic.com",
});
const font = await loadFont(googleFontUri, { loader });
assert.equal(font.metadata.descriptor.postscriptName, "Roboto-Regular");
const example = fontUriExample(font, "Hello portable PDF");
await mkdir(new URL("../artifacts/font-uri-live/", import.meta.url), { recursive: true });
const path = new URL("../artifacts/font-uri-live/roboto.pdf", import.meta.url).pathname;
await writeFile(path, example.bytes);
execFileSync("qpdf", ["--check", path]);
assert.match(execFileSync("pdftotext", [path, "-"], { encoding: "utf8" }), /Roboto-Regular/u);
console.log({ source: googleFontUri, ...example.metadata });

if (process.argv[2]) {
  const browser = await chromium.launch({
    executablePath: process.env.SHOWCASE_CHROMIUM ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    await page.goto(process.argv[2]);
    await page.locator('#demo-form[aria-busy="false"]').waitFor();
    await page.getByLabel("Example", { exact: true }).selectOption("font-uri");
    await page.locator('#demo-form[aria-busy="false"]').waitFor();
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    await page.locator('#demo-form[aria-busy="false"]').waitFor();
    assert.match(await page.locator("#status").innerText(), /Roboto-Regular.*submitted URI/u);
    const bytes = await page.locator("#download").evaluate(async (node) => {
      const response = await fetch((node as HTMLAnchorElement).href);
      return Array.from(new Uint8Array(await response.arrayBuffer()));
    });
    assert.deepEqual(new Uint8Array(bytes), example.bytes);
    await page.screenshot({
      path: new URL("../artifacts/font-uri-live/roboto-browser.png", import.meta.url).pathname,
      fullPage: true,
    });
    console.log("Live Google Fonts browser/Node PDF bytes match.");
  } finally {
    await browser.close();
  }
}
