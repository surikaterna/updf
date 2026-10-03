import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { mixedExample } from "../../apps/showcase/src/mixed.js";
import { textDemo } from "../../apps/showcase/src/text.js";
import { observeUrls, pdf, rendered, retained, screenshot, settledModule, site, source } from "./helpers.js";

test("mixed showcase actual source, all-page extraction, themed controls, mobile labels and Blob cleanup", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 375, height: 812 } });
    await observeUrls(page);
    await page.goto(app.url);
    await page.getByLabel("Example", { exact: true }).selectOption("mixed");
    await page.getByRole("button", { name: "Generate PDF" }).click();
    const expected = mixedExample("Hello portable PDF");
    assert.deepEqual(await pdf(page), expected.bytes);
    await rendered(page, expected.pageCount);
    await source(page, "mixed.ts");
    const path = new URL("../../artifacts/showcase/updf-mixed.pdf", import.meta.url).pathname;
    execFileSync("qpdf", ["--check", path]);
    const extracted = execFileSync("pdftotext", [path, "-"], { encoding: "utf8" });
    for (let number = 1; number <= expected.pageCount; number++)
      assert.ok(extracted.includes(`Page ${number}/${expected.pageCount}`));
    assert.match(extracted, /fixed cover[\s\S]*Section paragraph 1[\s\S]*fixed appendix/);
    await page.getByLabel("Mixed paragraph count").fill("2");
    await retained(page);
    await page.getByLabel("Orientation", { exact: true }).selectOption("landscape");
    await page.getByLabel("Page size (PDF points)").selectOption("Letter");
    await page.getByLabel("Captured provider theme").selectOption("amber");
    assert.deepEqual(
      await pdf(page, "mixed-controls.pdf"),
      mixedExample("Hello portable PDF", {
        count: 2,
        preset: "Letter",
        orientation: "landscape",
        theme: "amber",
        header: true,
        footer: true,
      }).bytes,
    );
    await page.getByLabel("Mixed paragraph count").focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.locator("#mixed-preset").evaluate((element) => element === document.activeElement), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await screenshot(page, "mixed-mobile");
  } finally {
    await app.close();
  }
});
test("mixed optional-chunk failure and slow theme changes cannot install stale PDFs", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.route("**/assets/optional-mixed-*.js", (route) => route.abort());
    await page.goto(app.url);
    await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("mixed");
    await page.getByRole("button", { name: "Generate PDF" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: /Generation failed/ })
      .waitFor();
    assert.deepEqual(await pdf(page), textDemo("Hello portable PDF"));
    const delayed = await app.browser.newPage();
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await delayed.route("**/assets/optional-mixed-*.js", async (route) => {
      await gate;
      await route.continue();
    });
    await delayed.goto(app.url);
    const request = delayed.waitForRequest("**/assets/optional-mixed-*.js");
    await delayed.getByLabel("Example", { exact: true }).selectOption("mixed");
    await delayed.getByRole("button", { name: "Generate PDF" }).click();
    await delayed.getByLabel("Captured provider theme").selectOption("amber");
    release?.();
    await settledModule(delayed, request);
    assert.deepEqual(
      await pdf(delayed),
      mixedExample("Hello portable PDF", {
        count: 12,
        preset: "A5",
        orientation: "portrait",
        theme: "amber",
        header: true,
        footer: true,
      }).bytes,
    );
    await source(delayed, "mixed.ts");
  } finally {
    await app.close();
  }
});
