import assert from "node:assert/strict";
import test from "node:test";
import { blockExample } from "../../apps/showcase/src/blocks.js";
import { flowExample } from "../../apps/showcase/src/flow.js";
import { mixedExample } from "../../apps/showcase/src/mixed.js";
import { richExample } from "../../apps/showcase/src/rich.js";
import { tableExample } from "../../apps/showcase/src/tables.js";
import { invoiceExample } from "../../examples/business/invoice.js";
import { manifestExample } from "../../examples/business/manifest.js";
import { observeUrls, pageErrors, pdf, rendered, site } from "./helpers.js";

test("all measured demos auto-publish latest bytes and ordered PDF canvases across mobile resize and restoration", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 3 });
    const errors = pageErrors(page);
    await observeUrls(page);
    await page.goto(app.url);
    for (const [id, example] of [
      ["rich", richExample],
      ["flow", flowExample],
      ["tables", tableExample],
      ["blocks", blockExample],
      ["mixed", mixedExample],
      ["invoice", invoiceExample],
      ["manifest", manifestExample],
    ] as const) {
      await page.getByLabel("Example", { exact: true }).selectOption(id);
      await page.getByLabel("PDF title", { exact: true }).fill("Obsolete draft");
      await page.getByLabel("PDF title", { exact: true }).fill("Latest PDF");
      const expected = example("Latest PDF");
      assert.deepEqual(await pdf(page, `live-${id}.pdf`), expected.bytes);
      const count = "result" in expected ? expected.result.pageCount : "pageCount" in expected ? expected.pageCount : 1;
      await rendered(page, count);
      await page.setViewportSize({ width: 320, height: 812 });
      await page.waitForFunction(() => document.querySelector("#demo-form")?.getAttribute("aria-busy") === "true");
      assert.deepEqual(await pdf(page, `mobile-${id}.pdf`), expected.bytes);
      await rendered(page, count);
      await canvasBounds(page);
      await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
      assert.equal(await page.evaluate(() => Reflect.get(window, "activePdfUrls").size), 0);
      await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
      assert.deepEqual(await pdf(page, `restored-${id}.pdf`), expected.bytes);
      await rendered(page, count);
      await page.setViewportSize({ width: 900, height: 900 });
    }
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

async function canvasBounds(page: import("playwright").Page): Promise<void> {
  const pages = await page.locator("#preview canvas").evaluateAll((elements) =>
    elements.map((element) => {
      if (!(element instanceof HTMLCanvasElement)) throw new Error("Expected canvas");
      return {
        label: element.getAttribute("aria-label"),
        width: element.width,
        pixels: element.width * element.height,
      };
    }),
  );
  assert.deepEqual(
    pages.map(({ label }) => label),
    pages.map((_, index) => `PDF page ${index + 1}`),
  );
  assert.ok(pages.every(({ width, pixels }) => width <= 320 * 3 && pixels <= 16_000_000));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
}
