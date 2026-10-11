import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { jpegExample } from "../../apps/showcase/src/jpeg.js";
import { observeUrls, pageErrors, pdf, rendered, retained, screenshot, site } from "./helpers.js";

async function fixture(variant: "color" | "gray") {
  return new Uint8Array(
    await readFile(new URL(`../fixtures/jpeg/${variant === "color" ? "color-1x1" : "gray"}.jpg`, import.meta.url)),
  );
}

test("JPEG is opt-in, matches Node bytes, switches grayscale and resizes at desktop/mobile widths", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 1100, height: 900 } });
    const requests: string[] = [],
      errors = pageErrors(page);
    page.on("request", (request) => requests.push(request.url()));
    await observeUrls(page);
    await page.goto(app.url);
    await pdf(page);
    assert.ok(!requests.some((url) => /optional-jpeg-|\.jpg/u.test(url)));
    await page.getByLabel("Example", { exact: true }).selectOption("jpeg");
    assert.deepEqual(await pdf(page), jpegExample(await fixture("color"), "Hello portable PDF").bytes);
    await rendered(page, 1);
    assert.ok(requests.some((url) => /color-1x1-.*\.jpg/u.test(url)));
    assert.ok(!requests.some((url) => /gray-.*\.jpg/u.test(url)));
    const source = await page.locator("#source").textContent();
    for (const name of ["jpeg.ts", "jpeg-controls.ts", "optional-jpeg.ts"])
      assert.ok(source?.includes(await readFile(new URL(`../../apps/showcase/src/${name}`, import.meta.url), "utf8")));
    assert.equal(await page.locator("#download").getAttribute("download"), "updf-jpeg.pdf");
    await screenshot(page, "jpeg-color-desktop");
    await page.getByLabel("JPEG sample", { exact: true }).selectOption("gray");
    await page.getByLabel("Image width (PDF points)", { exact: true }).fill("96");
    assert.deepEqual(
      await pdf(page),
      jpegExample(await fixture("gray"), "Hello portable PDF", { variant: "gray", width: 96 }).bytes,
    );
    assert.match(await page.locator("#status").innerText(), /grayscale JPEG.*PNG is not implemented/u);
    await page.setViewportSize({ width: 320, height: 812 });
    await page.waitForFunction(() => document.querySelector("#demo-form")?.getAttribute("aria-busy") === "true");
    await pdf(page);
    await rendered(page, 1);
    await retained(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await screenshot(page, "jpeg-gray-mobile");
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

test("JPEG validation/asset failures retain the old result and recover; reset restores the sample", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await observeUrls(page);
    await page.goto(app.url);
    const initial = await pdf(page);
    await page.route("**/*.jpg", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
    await page.getByLabel("Example", { exact: true }).selectOption("jpeg");
    assert.deepEqual(await pdf(page), initial);
    assert.match(await page.locator("#status").innerText(), /Unable to load original JPEG sample/u);
    await page.unroute("**/*.jpg");
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    const original = await pdf(page);
    assert.deepEqual(original, jpegExample(await fixture("color"), "Hello portable PDF").bytes);
    const args = await page.locator("#source-arguments").textContent();
    await page.getByLabel("Image width (PDF points)", { exact: true }).fill("193");
    assert.deepEqual(await pdf(page), original);
    assert.equal(await page.locator("#jpeg-width").getAttribute("aria-invalid"), "true");
    assert.equal(await page.locator("#source-arguments").textContent(), args);
    await page.getByRole("button", { name: "Reset demo", exact: true }).click();
    assert.deepEqual(await pdf(page), original);
    await retained(page);
    await page.getByLabel("Example", { exact: true }).selectOption("text");
    await pdf(page);
    assert.equal(await page.locator("#jpeg-controls").isVisible(), false);
  } finally {
    await app.close();
  }
});
