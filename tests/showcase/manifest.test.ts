import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { manifestExample } from "../../examples/business/manifest.js";
import { observeUrls, pageErrors, pdf, rendered, retained, screenshot, site } from "./helpers.js";

test("#46-B lazy manifest: actual source dependencies, keyboard, mixed page previews, complete desktop/mobile downloads", async () => {
  const expected = manifestExample("Hello portable PDF"),
    app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 });
    const errors = pageErrors(page),
      requests: string[] = [];
    await observeUrls(page);
    page.on("request", (request) => requests.push(request.url()));
    await page.goto(app.url);
    await pdf(page);
    assert.ok(!requests.some((url) => /optional-manifest-/.test(url)));
    await page.getByLabel("Example", { exact: true }).selectOption("manifest");
    const button = page.getByRole("button", { name: "Generate PDF", exact: true });
    await button.focus();
    await page.keyboard.press("Enter");
    assert.deepEqual(await pdf(page, "manifest-desktop.pdf"), expected.bytes);
    assert.equal(await page.locator("#download").getAttribute("download"), "updf-manifest.pdf");
    await rendered(page, 11);
    await assertPreview(page);
    await assertSource(page);
    assert.ok(requests.some((url) => /optional-manifest-/.test(url)));
    await screenshot(page, "manifest-desktop");
    await page.setViewportSize({ width: 320, height: 812 });
    await page.waitForFunction(() => document.querySelector("#demo-form")?.getAttribute("aria-busy") === "true");
    assert.deepEqual(await pdf(page, "manifest-mobile.pdf"), expected.bytes);
    await rendered(page, 11);
    await assertPreview(page);
    await retained(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await screenshot(page, "manifest-mobile");
    await page.locator("#example-code summary").click();
    await page.getByLabel("Example source", { exact: true }).focus();
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Example source");
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    assert.equal(await page.evaluate(() => Reflect.get(window, "activePdfUrls").size), 0);
    await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
    assert.deepEqual(await pdf(page, "manifest-restored.pdf"), expected.bytes);
    await rendered(page, 11);
    await retained(page);
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});
async function assertPreview(page: import("playwright").Page) {
  const sizes = await page.locator("#preview canvas").evaluateAll((nodes) =>
    nodes.map((node) => {
      if (!(node instanceof HTMLCanvasElement)) throw new Error("Expected canvas");
      return { label: node.getAttribute("aria-label"), ratio: node.width / node.height };
    }),
  );
  assert.equal(sizes.length, 11);
  sizes.forEach((size, index) => {
    assert.equal(size.label, `PDF page ${index + 1}`);
    assert.ok(
      Math.abs(size.ratio - (index === 0 || index === 10 ? 595.275591 / 841.889764 : 841.889764 / 595.275591)) < 0.01,
    );
  });
}
async function assertSource(page: import("playwright").Page) {
  const paths = ["manifest.tsx", "components.tsx", "manifest-calculations.ts", "manifest-data.ts", "invoice-data.ts"];
  const modules = await Promise.all(
    paths.map(async (name) => [
      `// examples/business/${name}${name === "invoice-data.ts" ? " (shared Address type; invoice fixture not executed)" : ""}`,
      await readFile(new URL(`../../examples/business/${name}`, import.meta.url), "utf8"),
    ]),
  );
  assert.equal(
    await page.locator("#source").textContent(),
    [
      "// Multi-file example: save these modules together in examples/business; imports are intentional.",
      ...modules.flat(),
    ].join("\n"),
  );
}
