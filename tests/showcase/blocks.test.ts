import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { blockDefaults, blockExample } from "../../apps/showcase/src/blocks.js";
import { textDemo } from "../../apps/showcase/src/text.js";
import { observeUrls, pdf, rendered, retained, screenshot, settledModule, site, source } from "./helpers.js";

test("visible block/chart demo has actual sources, Node/browser bytes, error/hidden controls and extractable clipped text", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 375, height: 812 } });
    await observeUrls(page);
    await page.goto(app.url);
    await page.getByLabel("Example", { exact: true }).selectOption("blocks");
    await page.getByRole("button", { name: "Generate PDF" }).click();
    assert.deepEqual(await pdf(page), blockExample("Hello portable PDF").bytes);
    await rendered(page, blockExample("Hello portable PDF").result.pageCount);
    await blockSource(page);
    assert.match(await page.getByRole("status").innerText(), /3 authored body blocks; .*fragments.*Overflow: error/u);
    await page.getByLabel("Block border-box height (0 = natural)").fill("48");
    await retained(page);
    await page
      .getByRole("status")
      .filter({ hasText: /VERTICAL_OVERFLOW/u })
      .waitFor();
    await retained(page);
    await page.getByLabel("Clip constrained overflow (hidden)").check();
    await page.getByLabel("Keep whole block together").check();
    assert.deepEqual(
      await pdf(page, "block-hidden.pdf"),
      blockExample("Hello portable PDF", { ...blockDefaults, blockHeight: 48, hidden: true, keepTogether: true }).bytes,
    );
    assert.match(await page.getByRole("status").innerText(), /1 pages.*hidden \(not redaction\)/u);
    const path = new URL("../../artifacts/showcase/block-hidden.pdf", import.meta.url).pathname;
    execFileSync("qpdf", ["--check", path]);
    assert.match(
      execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" }),
      /Clipped text is still extractable/u,
    );
    await page.getByLabel("Chart natural height").focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.locator("#block-height").evaluate((element) => element === document.activeElement), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await screenshot(page, "blocks-mobile");
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    assert.deepEqual(await pdf(page), textDemo("Hello portable PDF"));
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    assert.equal(await page.evaluate(() => Reflect.get(window, "activePdfUrls").size), 0);
  } finally {
    await app.close();
  }
});
async function blockSource(page: import("playwright").Page): Promise<void> {
  const example = await readFile(new URL("../../apps/showcase/src/blocks.tsx", import.meta.url), "utf8");
  const chart = await readFile(new URL("../../apps/showcase/src/chart.ts", import.meta.url), "utf8");
  assert.equal(
    await page.locator("#source").textContent(),
    `${example}\n// Imported external producer: chart.ts\n${chart}`,
  );
}

test("block demo natural/whole/oversize presets remain bounded and service-independent", () => {
  const natural = blockExample("Title", blockDefaults);
  const kept = blockExample("Title", { ...blockDefaults, keepTogether: true });
  assert.ok(kept.result.pageCount >= natural.result.pageCount);
  assert.throws(() => blockExample("Title", { ...blockDefaults, chartHeight: 181 }), /40–180/u);
  assert.throws(() => blockExample("Title", { ...blockDefaults, chartHeight: 180, keepTogether: true }), /fresh body/u);
});
test("optional block load failures are readable and changing demos cancels late preview/Blob output", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.route("**/assets/optional-blocks-*.js", (route) => route.abort());
    await page.goto(app.url);
    await page.getByLabel("Example", { exact: true }).selectOption("blocks");
    await page.getByRole("button", { name: "Generate PDF" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: /Generation failed/u })
      .waitFor();
    const cancelled = await app.browser.newPage();
    await observeUrls(cancelled);
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await cancelled.route("**/assets/optional-blocks-*.js", async (route) => {
      await gate;
      await route.continue();
    });
    await cancelled.goto(app.url);
    const request = cancelled.waitForRequest("**/assets/optional-blocks-*.js");
    await cancelled.getByLabel("Example", { exact: true }).selectOption("blocks");
    await cancelled.getByRole("button", { name: "Generate PDF" }).click();
    await cancelled.getByLabel("Example", { exact: true }).selectOption("text");
    release?.();
    await settledModule(cancelled, request);
    assert.deepEqual(await pdf(cancelled), textDemo("Hello portable PDF"));
    await rendered(cancelled);
    await source(cancelled, "text.ts");
  } finally {
    await app.close();
  }
});
