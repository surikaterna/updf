import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { richDefaults, richExample } from "../../apps/showcase/src/rich.js";
import { observeUrls, pdf, rendered, retained, screenshot, site, source } from "./helpers.js";

test("rich showcase exact source, Node/Chromium bytes, controls, natural geometry, diagnostic and URL cleanup", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 375, height: 812 } });
    await observeUrls(page);
    await page.goto(app.url);
    await page.getByLabel("Example", { exact: true }).selectOption("rich");
    await source(page, "rich.tsx");
    await page.getByRole("button", { name: "Generate PDF" }).click();
    assert.deepEqual(await pdf(page), richExample("Hello portable PDF").bytes);
    await rendered(page);
    assert.match(
      await page.getByRole("status").innerText(),
      /\d+ lines, \d+(?:\.\d+)? points consumed height\. Policy: trusted/,
    );
    await page.getByLabel("Width", { exact: true }).fill("120");
    await retained(page);
    await page.getByLabel("Font size", { exact: true }).fill("12");
    await page.getByLabel("Alignment", { exact: true }).selectOption("right");
    await page.getByLabel("Whitespace", { exact: true }).selectOption("collapse");
    await page.getByLabel("Long words", { exact: true }).selectOption("codePoint");
    assert.deepEqual(
      await pdf(page, "rich-controls.pdf"),
      richExample("Hello portable PDF", {
        ...richDefaults,
        width: 120,
        fontSize: 12,
        align: "right",
        whiteSpace: "collapse",
        breakLongWords: "codePoint",
      }).bytes,
    );
    await page.getByLabel("Width", { exact: true }).fill("20");
    await page.getByLabel("Long words", { exact: true }).selectOption("error");
    await page
      .getByRole("status")
      .filter({ hasText: /TOKEN_OVERFLOW at .*children/ })
      .waitFor();
    await page.getByLabel("Width", { exact: true }).focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.locator("#rich-font-size").evaluate((element) => element === document.activeElement), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await screenshot(page, "rich-mobile");
    inspect();
  } finally {
    await app.close();
  }
});
function inspect(): void {
  const path = new URL("../../artifacts/showcase/updf-rich.pdf", import.meta.url).pathname;
  execFileSync("qpdf", ["--check", path]);
  assert.match(execFileSync("pdftotext", [path, "-"], { encoding: "utf8" }), /Hello portable PDF/);
}
