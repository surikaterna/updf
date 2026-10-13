import assert from "node:assert/strict";
import test from "node:test";
import { pdf, site } from "./helpers.js";

test("PNG and font-URI demos coexist with isolated arguments, drafts and cancellation", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    let pngRequests = 0;
    await page.route("**/color-alpha-*.png", (route) => {
      if (++pngRequests > 1) return route.continue();
    });
    await page.goto(app.url);
    await pdf(page);
    const png = page.waitForRequest("**/color-alpha-*.png");
    await page.getByLabel("Example", { exact: true }).selectOption("png");
    await png;
    const abortedPng = page.waitForEvent("requestfailed", (request) => /color-alpha-/u.test(request.url()));
    await page.getByLabel("Example", { exact: true }).selectOption("font-uri");
    await abortedPng;
    await pdf(page);
    assert.match(await page.locator("#status").innerText(), /bundled sample/u);
    await page.getByLabel("Font file URI", { exact: true }).fill("unsubmitted-draft");
    await page.getByLabel("Example", { exact: true }).selectOption("png");
    await pdf(page);
    assert.equal(pngRequests, 2);
    await page.getByLabel("PNG width (PDF points)", { exact: true }).fill("96");
    await pdf(page);
    assert.deepEqual(JSON.parse((await page.locator("#source-arguments").textContent())!).controls, {
      variant: "color",
      width: 96,
    });
    await page.getByLabel("Example", { exact: true }).selectOption("font-uri");
    await pdf(page);
    assert.deepEqual(JSON.parse((await page.locator("#source-arguments").textContent())!).controls, {
      uri: "",
      fontSize: 18,
    });
  } finally {
    await app.close();
  }
});

test("switching a stalled font replacement to PNG cancels it without losing either successful sample", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    let requests = 0;
    await page.route("https://font.invalid/held.ttf", () => {
      requests++;
    });
    await page.goto(app.url);
    await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("font-uri");
    const activeFontPdf = await pdf(page);
    await page.getByLabel("Font file URI", { exact: true }).fill("https://font.invalid/held.ttf");
    const pending = page.waitForRequest("https://font.invalid/held.ttf");
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    await pending;
    const aborted = page.waitForEvent("requestfailed", (request) => request.url().endsWith("/held.ttf"));
    await page.getByLabel("Example", { exact: true }).selectOption("png");
    await aborted;
    await pdf(page);
    assert.match(await page.locator("#status").innerText(), /color PNG with alpha/u);
    await page.getByLabel("Example", { exact: true }).selectOption("font-uri");
    assert.deepEqual(await pdf(page), activeFontPdf);
    assert.equal(requests, 1);
  } finally {
    await app.close();
  }
});
