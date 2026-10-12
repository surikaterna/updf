import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { pngExample } from "../../apps/showcase/src/png.js";
import { canonicalPngPdf } from "../fixtures/png/pdf-equivalence.js";
import { observeUrls, pageErrors, pdf, rendered, retained, screenshot, site } from "./helpers.js";

async function fixture(variant: "color" | "gray") {
  return new Uint8Array(await readFile(new URL(`../fixtures/png/${variant}-alpha.png`, import.meta.url)));
}
async function nodePdf(variant: "color" | "gray", width = 192) {
  return canonicalPngPdf((await pngExample(await fixture(variant), "Hello portable PDF", { variant, width })).bytes);
}

test("PNG loads on demand, previews alpha and matches Node at desktop/mobile sizes", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 1100, height: 900 } });
    const requests: string[] = [],
      errors = pageErrors(page);
    page.on("request", (request) => requests.push(request.url()));
    await observeUrls(page);
    await page.goto(app.url);
    await pdf(page);
    assert.ok(!requests.some((url) => /optional-png-|(?:color|gray)-alpha-.*\.png/u.test(url)));
    await page.getByLabel("Example", { exact: true }).selectOption("png");
    assert.deepEqual(canonicalPngPdf(await pdf(page)), await nodePdf("color"));
    await rendered(page, 1);
    await checkPreviewAlpha(page);
    assert.ok(requests.some((url) => /color-alpha-.*\.png/u.test(url)));
    assert.ok(!requests.some((url) => /gray-alpha-.*\.png|optional-jpeg-/u.test(url)));
    const source = await page.locator("#source").textContent();
    for (const name of ["png.ts", "png-controls.ts", "optional-png.ts"])
      assert.ok(source?.includes(await readFile(new URL(`../../apps/showcase/src/${name}`, import.meta.url), "utf8")));
    assert.equal(await page.locator("#download").getAttribute("download"), "updf-png.pdf");
    await screenshot(page, "png-color-desktop");
    await page.getByLabel("PNG sample", { exact: true }).selectOption("gray");
    await page.getByLabel("PNG width (PDF points)", { exact: true }).fill("96");
    assert.deepEqual(canonicalPngPdf(await pdf(page)), await nodePdf("gray", 96));
    assert.match(await page.locator("#status").innerText(), /grayscale PNG with alpha/u);
    await page.setViewportSize({ width: 320, height: 812 });
    await page.waitForFunction(() => document.querySelector("#demo-form")?.getAttribute("aria-busy") === "true");
    await pdf(page);
    await rendered(page, 1);
    await retained(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await screenshot(page, "png-gray-mobile");
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

async function checkPreviewAlpha(page: import("playwright").Page): Promise<void> {
  const samples = await page.locator("#preview canvas").evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext("2d")!;
    return [
      [72, 174],
      [168, 174],
      [72, 246],
      [408, 174],
      [312, 246],
    ].map(([x, y]) =>
      [
        ...context.getImageData(Math.floor((x! * canvas.width) / 480), Math.floor((y! * canvas.height) / 600), 1, 1)
          .data,
      ].slice(0, 3),
    );
  });
  const expected = [
    [230, 30, 20],
    [137, 232, 147],
    [255, 255, 255],
    [35, 156, 122],
    [51, 102, 204],
  ];
  for (let index = 0; index < samples.length; index++)
    assert.ok(
      expected[index]!.every((value, channel) => Math.abs(value - samples[index]![channel]!) <= 3),
      `${samples[index]}`,
    );
}

test("PNG failures retain the prior PDF/source, recover on retry and reset to defaults", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await observeUrls(page);
    await page.goto(app.url);
    const initial = await pdf(page);
    await page.route("**/*-alpha-*.png", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
    await page.getByLabel("Example", { exact: true }).selectOption("png");
    assert.deepEqual(await pdf(page), initial);
    assert.match(await page.locator("#status").innerText(), /Unable to load original PNG sample/u);
    await page.unroute("**/*-alpha-*.png");
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    const original = await pdf(page);
    assert.deepEqual(canonicalPngPdf(original), await nodePdf("color"));
    const args = await page.locator("#source-arguments").textContent();
    await page.getByLabel("PNG width (PDF points)", { exact: true }).fill("193");
    assert.deepEqual(await pdf(page), original);
    assert.equal(await page.locator("#png-width").getAttribute("aria-invalid"), "true");
    assert.equal(await page.locator("#source-arguments").textContent(), args);
    await page.getByRole("button", { name: "Reset demo", exact: true }).click();
    assert.deepEqual(await pdf(page), original);
    await retained(page);
    await page.getByLabel("Example", { exact: true }).selectOption("text");
    await pdf(page);
    assert.equal(await page.locator("#png-controls").isVisible(), false);
  } finally {
    await app.close();
  }
});
