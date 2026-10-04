import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { invoiceExample } from "../../examples/business/invoice.js";
import { pageErrors, pdf, rendered, screenshot, site } from "./helpers.js";

test("#46-A lazy invoice: truthful module dependencies, desktop/mobile full PDF download and accessible ordered previews", async () => {
  const expected = invoiceExample("Hello portable PDF");
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 });
    const errors = pageErrors(page);
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto(app.url);
    await pdf(page);
    assert.ok(!requests.some((url) => /optional-invoice-/.test(url)));
    await page.getByLabel("Example", { exact: true }).selectOption("invoice");
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    assert.deepEqual(await pdf(page, "invoice-desktop.pdf"), expected.bytes);
    assert.equal(await page.locator("#download").getAttribute("download"), "updf-invoice.pdf");
    await rendered(page, 3);
    await page.getByLabel("Generated PDF preview", { exact: true }).waitFor();
    await assertSource(page);
    assert.ok(requests.some((url) => /optional-invoice-/.test(url)));
    await screenshot(page, "invoice-desktop");
    await page.setViewportSize({ width: 320, height: 812 });
    await page.waitForFunction(() => document.querySelector("#demo-form")?.getAttribute("aria-busy") === "true");
    assert.deepEqual(await pdf(page, "invoice-mobile.pdf"), expected.bytes);
    await rendered(page, 3);
    assert.deepEqual(
      await page
        .locator("#preview canvas")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label"))),
      ["PDF page 1", "PDF page 2", "PDF page 3"],
    );
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await screenshot(page, "invoice-mobile");
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});
async function assertSource(page: import("playwright").Page) {
  const names = ["invoice.tsx", "components.tsx", "invoice-calculations.ts", "invoice-data.ts"];
  const modules = await Promise.all(
    names.map(async (name) => [
      `// examples/business/${name}`,
      await readFile(new URL(`../../examples/business/${name}`, import.meta.url), "utf8"),
    ]),
  );
  const source = [
    "// Multi-file example: save these modules together in examples/business; imports are intentional.",
    ...modules.flat(),
  ].join("\n");
  assert.equal(await page.locator("#source").textContent(), source);
}
