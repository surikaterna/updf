import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { freightInvoiceExample } from "../../examples/business/freight-invoice.js";
import { extendedFreightInvoice } from "../../examples/business/freight-invoice-data.js";
import { freightFonts } from "../fixtures/fonts/freight-fonts.js";
import { observeUrls, pageErrors, pdf, rendered, retained, screenshot, site } from "./helpers.js";

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
test("freight extended: two complete desktop/mobile pages, Node parity, title and download lifecycle", async () => {
  const resources = await freightFonts();
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 1100, height: 900 } });
    await observeUrls(page);
    const errors = pageErrors(page);
    await page.goto(app.url);
    await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("freight-invoice-extended");
    for (const width of [1100, 320]) {
      if (width === 320) {
        await page.setViewportSize({ width, height: 812 });
        await page.waitForFunction(() => document.querySelector("#demo-form")?.getAttribute("aria-busy") === "true");
      }
      assert.deepEqual(
        await pdf(page, `freight-extended-${width}.pdf`),
        freightInvoiceExample(resources, "Hello portable PDF", extendedFreightInvoice).bytes,
      );
      await assertExtendedPreview(page);
      await retained(page);
      await assertSource(page);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await screenshot(page, `freight-extended-${width}`);
    }
    await page.getByLabel("PDF title", { exact: true }).fill("Extended description");
    assert.deepEqual(
      await pdf(page),
      freightInvoiceExample(resources, "Extended description", extendedFreightInvoice).bytes,
    );
    await assertExtendedPreview(page);
    await retained(page);
    await page.getByLabel("Example", { exact: true }).selectOption("text");
    await pdf(page);
    await retained(page);
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});
async function assertExtendedPreview(page: import("playwright").Page) {
  await rendered(page, 2);
  assert.match(await page.locator("#status").innerText(), /2 A4 page\(s\); 8 original/u);
  assert.equal(await page.locator("#download").getAttribute("download"), "updf-freight-invoice-extended.pdf");
  for (const [index, canvas] of (await page.locator("#preview canvas").all()).entries()) {
    assert.equal(await canvas.getAttribute("aria-label"), `PDF page ${index + 1}`);
    const size = await canvas.boundingBox();
    assert.ok(size && size.width > 0 && Math.abs(size.height / size.width - 841.889764 / 595.275591) < 0.01);
  }
}
test("freight lazy font failure retains the old download and recovers across presets", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await observeUrls(page);
    await page.goto(app.url);
    const before = await pdf(page);
    await page.route("**/*.ttf", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
    await page.getByLabel("Example", { exact: true }).selectOption("freight-invoice-extended");
    await page.locator('#demo-form[aria-busy="false"]').waitFor();
    assert.match(await page.locator("#status").innerText(), /Unable to load licensed freight font asset/u);
    assert.deepEqual(await pdf(page), before);
    await retained(page);
    await page.unroute("**/*.ttf");
    await page.getByLabel("Example", { exact: true }).selectOption("freight-invoice");
    assert.deepEqual(await pdf(page), freightInvoiceExample(await freightFonts(), "Hello portable PDF").bytes);
    await rendered(page, 1);
    await retained(page);
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
