import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { freightInvoiceExample } from "../../examples/business/freight-invoice.js";
import { freightFonts } from "../fixtures/fonts/freight-fonts.js";
import { pageErrors, pdf, rendered, screenshot, site } from "./helpers.js";

test("followup46 opt-in freight: Node bytes, actual sources, one accessible page at desktop/320px", async () => {
  const resources = await freightFonts();
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 });
    const errors = pageErrors(page);
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto(app.url);
    await pdf(page);
    assert.ok(!requests.some((url) => /optional-freight-invoice-|\.ttf/u.test(url)));
    await page.getByLabel("Example", { exact: true }).selectOption("freight-invoice");
    assert.deepEqual(
      await pdf(page, "freight-desktop.pdf"),
      freightInvoiceExample(resources, "Hello portable PDF").bytes,
    );
    await rendered(page, 1);
    await assertSource(page);
    assert.equal(await page.locator("#download").getAttribute("download"), "updf-freight-invoice.pdf");
    assert.ok(requests.some((url) => /optional-freight-invoice-/u.test(url)));
    assert.equal(requests.filter((url) => /\.ttf$/u.test(url)).length, 2);
    await screenshot(page, "freight-desktop");
    await page.setViewportSize({ width: 320, height: 812 });
    await page.waitForFunction(() => document.querySelector("#demo-form")?.getAttribute("aria-busy") === "true");
    assert.deepEqual(
      await pdf(page, "freight-mobile.pdf"),
      freightInvoiceExample(resources, "Hello portable PDF").bytes,
    );
    await rendered(page, 1);
    assert.equal(await page.locator("#preview canvas").getAttribute("aria-label"), "PDF page 1");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await screenshot(page, "freight-mobile");
    await page.getByLabel("PDF title", { exact: true }).fill("W".repeat(40));
    assert.deepEqual(
      await pdf(page, "freight-description.pdf"),
      freightInvoiceExample(resources, "W".repeat(40)).bytes,
    );
    await rendered(page, 1);
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});
async function assertSource(page: import("playwright").Page) {
  const source = await page.locator("#source").textContent();
  for (const name of [
    "freight-invoice.tsx",
    "freight-invoice-sections.tsx",
    "freight-invoice-calculations.ts",
    "freight-invoice-data.ts",
    "freight-invoice-fonts.ts",
  ]) {
    assert.ok(source?.includes(await readFile(new URL(`../../examples/business/${name}`, import.meta.url), "utf8")));
  }
  for (const path of [
    "scripts/freight-invoice-example.ts",
    "apps/showcase/src/optional-freight-invoice.ts",
    "tests/fixtures/fonts/FREIGHT.md",
  ]) {
    assert.ok(source?.includes(await readFile(new URL(`../../${path}`, import.meta.url), "utf8")));
  }
}
