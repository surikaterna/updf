import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { Page } from "playwright";
import { tableIconSource, tableVisual } from "../../apps/showcase/src/optional-table-svg.js";
import { tableDefaults, tableExample } from "../../apps/showcase/src/tables.js";
import { textDemo } from "../../apps/showcase/src/text.js";
import { observeUrls, pdf, rendered, retained, screenshot, settledModule, site, source } from "./helpers.js";

async function tableSource(page: Page) {
  await source(page, "tables.tsx");
  const displayed = await page.locator("#source").innerText();
  assert.match(displayed, /borderRight:[\s\S]*borderLeft: null/u);
  assert.match(displayed, /width: \{ weight: wide \? 270 : 140, min: 100 \}/u);
}

test("optional table source/download, mobile controls, counts, oversize diagnostics and Blob cleanup", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 375, height: 812 } });
    await observeUrls(page);
    await page.goto(app.url);
    await page.getByLabel("Example", { exact: true }).selectOption("tables");
    await page.getByRole("button", { name: "Generate PDF" }).click();
    assert.deepEqual(await pdf(page), tableExample("Hello portable PDF").bytes);
    await rendered(page, tableExample("Hello portable PDF").result.pageCount);
    await tableSource(page);
    assert.match(await page.getByRole("status").innerText(), /12 body rows; \d+ repeated headers/u);
    await page.getByLabel("Body row count", { exact: true }).fill("3");
    await page.getByLabel("Table width preset").selectOption("wide");
    await page.getByLabel("Repeat table header").uncheck();
    await page.getByLabel("Wrapped descriptions").uncheck();
    assert.deepEqual(
      await pdf(page, "table-controls.pdf"),
      tableExample("Hello portable PDF", {
        ...tableDefaults,
        count: 3,
        preset: "wide",
        repeatHeader: false,
        wrapped: false,
      }).bytes,
    );
    await page.getByLabel("Table width preset").selectOption("overflow");
    await page
      .getByRole("status")
      .filter({ hasText: /LAYOUT_OVERSIZED/u })
      .waitFor();
    await retained(page);
    await page.getByLabel("Body row count", { exact: true }).focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.locator("#table-preset").evaluate((el) => el === document.activeElement), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await screenshot(page, "tables-mobile");
    const path = new URL("../../artifacts/showcase/updf-tables.pdf", import.meta.url).pathname;
    execFileSync("qpdf", ["--check", path]);
    const text = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" });
    assert.deepEqual(
      text.match(/Item \d+/gu),
      Array.from({ length: 12 }, (_, i) => `Item ${i + 1}`),
    );
  } finally {
    await app.close();
  }
});
test("optional table loading failure is readable and a delayed generation is cancelled", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.route("**/assets/optional-tables-*.js", (route) => route.abort());
    await page.goto(app.url);
    await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("tables");
    await page.getByRole("button", { name: "Generate PDF" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: /Generation failed/u })
      .waitFor();
    assert.deepEqual(await pdf(page), textDemo("Hello portable PDF"));
    const cancelled = await app.browser.newPage();
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await cancelled.route("**/assets/optional-tables-*.js", async (route) => {
      await gate;
      await route.continue();
    });
    await cancelled.goto(app.url);
    const request = cancelled.waitForRequest("**/assets/optional-tables-*.js");
    await cancelled.getByLabel("Example", { exact: true }).selectOption("tables");
    await cancelled.getByRole("button", { name: "Generate PDF" }).click();
    await cancelled.getByLabel("Example", { exact: true }).selectOption("text");
    release?.();
    await settledModule(cancelled, request);
    assert.deepEqual(await pdf(cancelled), textDemo("Hello portable PDF"));
    await source(cancelled, "text.ts");
  } finally {
    await app.close();
  }
});
test("F actual table chart/SVG presets have Node/Chromium byte parity and SVG loads only on selection", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto(app.url);
    assert.ok(!requests.some((url) => /optional-(?:tables|table-svg)/u.test(url)));
    await page.getByLabel("Example", { exact: true }).selectOption("tables");
    await page.getByLabel("Body row count", { exact: true }).fill("2");
    await page.getByLabel("Cell content preset").selectOption("chart");
    assert.deepEqual(
      await pdf(page, "table-chart.pdf"),
      tableExample("Hello portable PDF", { ...tableDefaults, count: 2, cellPreset: "chart" }).bytes,
    );
    assert.ok(!requests.some((url) => /optional-table-svg/u.test(url)));
    await page.getByLabel("Cell content preset").selectOption("svg");
    const bytes = await pdf(page, "table-svg.pdf");
    assert.deepEqual(
      bytes,
      tableExample("Hello portable PDF", { ...tableDefaults, count: 2, cellPreset: "svg" }, tableVisual).bytes,
    );
    assert.ok(requests.some((url) => /optional-table-svg/u.test(url)));
    const path = new URL("../../artifacts/showcase/table-svg.pdf", import.meta.url).pathname;
    execFileSync("qpdf", ["--check", path]);
    const text = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" });
    assert.deepEqual(text.match(/Item \d+/gu), ["Item 1", "Item 2"]);
    assert.equal(text.match(/Inline badge/gu)?.length, 2);
    assert.equal(text.match(/Inventory totals/gu)?.length, 1);
    await compareSVGReference(page, path);
  } finally {
    await app.close();
  }
});
async function compareSVGReference(page: Page, path: string): Promise<void> {
  const expected = await page.evaluate(async (source) => {
    const image = new Image();
    image.src = `data:image/svg+xml,${encodeURIComponent(source)}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 24;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Missing canvas");
    context.drawImage(image, 0, 0, 40, 24);
    return [
      [20, 12],
      [4, 4],
    ].map(([x, y]) => Array.from(context.getImageData(x ?? 0, y ?? 0, 1, 1).data).slice(0, 3));
  }, tableIconSource);
  const prefix = path.replace(/\.pdf$/u, "");
  execFileSync("pdftoppm", ["-f", "1", "-singlefile", "-r", "144", path, prefix]);
  const ppm = await readFile(`${prefix}.ppm`);
  const start = ppm.indexOf(Buffer.from("\n255\n")) + 5;
  const pixel = (x: number, y: number) =>
    Array.from(ppm.subarray(start + (y * 480 + x) * 3, start + (y * 480 + x) * 3 + 3));
  assert.deepEqual(pixel(82, 198), expected[0], "Native SVG circle must occupy the measured cell icon center");
  assert.deepEqual(pixel(50, 182), expected[1], "Native SVG rectangle must occupy the measured cell icon corner");
  assert.notDeepEqual(pixel(122, 198), expected[0], "A displaced circle is not an equivalent reference");
}
