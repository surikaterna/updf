import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { flowDefaults, flowExample } from "../../apps/showcase/src/flow.js";
import { textDemo } from "../../apps/showcase/src/text.js";
import { observeUrls, pdf, rendered, retained, screenshot, settledModule, site, source } from "./helpers.js";

test("intentional overflow keeps template valid with either region toggle", () => {
  for (const regions of [false, true]) {
    assert.throws(
      () => flowExample("Hello portable PDF", { ...flowDefaults, preset: "overflow", regions }),
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LAYOUT_OVERSIZED",
    );
  }
});

test("optional flow actual source/downloads, bounded mobile controls, page counts, overflow and cleanup", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 375, height: 812 } });
    await observeUrls(page);
    await page.goto(app.url);
    await page.getByLabel("Example", { exact: true }).selectOption("flow");
    await page.getByRole("button", { name: "Generate PDF" }).click();
    assert.deepEqual(await pdf(page), flowExample("Hello portable PDF").bytes);
    await rendered(page, flowExample("Hello portable PDF").result.pageCount);
    await source(page, "flow.tsx");
    assert.match(await page.getByRole("status").innerText(), /3 pages; 6 authored paragraphs; \d+ fragments/);
    await page.getByLabel("Paragraph count", { exact: true }).fill("2");
    await retained(page);
    await page.getByLabel("Page preset", { exact: true }).selectOption("letter");
    await page.getByLabel("Repeat header and footer").uncheck();
    await page.getByLabel("Keep each paragraph together").check();
    assert.deepEqual(
      await pdf(page, "flow-controls.pdf"),
      flowExample("Hello portable PDF", {
        ...flowDefaults,
        count: 2,
        preset: "letter",
        regions: false,
        keepTogether: true,
      }).bytes,
    );
    await page.getByLabel("Page preset", { exact: true }).selectOption("overflow");
    await page
      .getByRole("status")
      .filter({ hasText: /LAYOUT_OVERSIZED at \/document\/children\/body\/0/ })
      .waitFor();
    await retained(page);
    await page.getByLabel("Paragraph count", { exact: true }).focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.locator("#flow-preset").evaluate((element) => element === document.activeElement), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await screenshot(page, "flow-mobile");
    const path = new URL("../../artifacts/showcase/updf-flow.pdf", import.meta.url).pathname;
    execFileSync("qpdf", ["--check", path]);
    assert.match(execFileSync("pdftotext", [path, "-"], { encoding: "utf8" }), /Repeated footer/);
  } finally {
    await app.close();
  }
});

test("optional flow load failure is readable and delayed results are cancelled", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.route("**/assets/optional-flow-*.js", (route) => route.abort());
    await page.goto(app.url);
    await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("flow");
    await page.getByRole("button", { name: "Generate PDF" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: /Generation failed/ })
      .waitFor();
    assert.deepEqual(await pdf(page), textDemo("Hello portable PDF"));
    const cancelled = await app.browser.newPage();
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await cancelled.route("**/assets/optional-flow-*.js", async (route) => {
      await gate;
      await route.continue();
    });
    await cancelled.goto(app.url);
    const request = cancelled.waitForRequest("**/assets/optional-flow-*.js");
    await cancelled.getByLabel("Example", { exact: true }).selectOption("flow");
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
