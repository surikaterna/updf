import assert from "node:assert/strict";
import test from "node:test";
import { paintingDemo } from "../../apps/showcase/src/painting.js";
import { svgDemo } from "../../apps/showcase/src/svg.js";
import { templateDemo } from "../../apps/showcase/src/template.js";
import { textDemo } from "../../apps/showcase/src/text.js";
import { observeUrls, pageErrors, pdf, screenshot, site, source } from "./helpers.js";

const title = "Hello portable PDF";

test("actual /updf/ site: synchronized sources, all downloadable PDFs identical to Node, lazy SVG", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    const requests: string[] = [];
    const errors: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(app.url);
    await source(page, "text.ts");
    assert.ok(!requests.some((url) => /optional-.*\.js/.test(url)));
    for (const [id, file, render] of [
      ["text", "text.ts", textDemo],
      ["template", "template.tsx", templateDemo],
      ["painting", "painting.ts", paintingDemo],
      ["svg", "svg.ts", svgDemo],
    ] as const) {
      await page.getByLabel("Example", { exact: true }).selectOption(id);
      await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
      assert.deepEqual(await pdf(page), render(title));
      await source(page, file);
      if (id !== "svg") assert.ok(!requests.some((url) => /optional-.*\.js/.test(url)));
    }
    assert.ok(requests.some((url) => /optional-.*\.js/.test(url)));
    assert.ok(requests.filter((url) => url.includes("/assets/")).every((url) => url.includes("/updf/assets/")));
    const notices = await page
      .locator("[data-local]")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    for (const href of notices) {
      assert.ok(href);
      assert.ok(href.startsWith("/updf/notices/"));
      assert.equal((await page.request.get(new URL(href, app.url).href)).status(), 200);
    }
    const issues = await page
      .locator("#roadmap a")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    assert.deepEqual(
      issues,
      Array.from({ length: 11 }, (_, i) => `https://github.com/surikaterna/updf/issues/${25 + i}`),
    );
    assert.equal(await page.evaluate(() => typeof Buffer), "undefined");
    assert.equal(await page.evaluate(() => typeof process), "undefined");
    assert.deepEqual(errors, []);
    await screenshot(page, "desktop");
  } finally {
    await app.close();
  }
});

test("mobile keyboard, readable validation and Blob cleanup on edits, repeat generation, reset and pagehide", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 375, height: 812 } });
    const errors = pageErrors(page);
    await observeUrls(page);
    await page.goto(app.url);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByLabel("PDF title", { exact: true }).focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.locator("#generate").evaluate((element) => element === document.activeElement), true);
    await page.keyboard.press("Enter");
    await pdf(page);
    await screenshot(page, "mobile");
    await page.getByRole("button", { name: "Generate PDF" }).click();
    await pdf(page);
    assert.equal(await activeUrls(page), 1);
    await page.getByLabel("PDF title", { exact: true }).fill("Привет");
    assert.equal(await activeUrls(page), 0);
    await page.getByRole("button", { name: "Generate PDF" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: /at .*:/ })
      .waitFor();
    assert.equal(await page.locator("#output").isVisible(), false);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await page.getByRole("button", { name: "Generate PDF" }).click();
    await pdf(page);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    assert.equal(await activeUrls(page), 0);
    await page.getByRole("button", { name: "Generate PDF" }).click();
    await pdf(page);
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    assert.equal(await activeUrls(page), 0);
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

async function activeUrls(page: import("playwright").Page): Promise<number> {
  return page.evaluate(() => {
    const active: unknown = Reflect.get(window, "activePdfUrls");
    if (!(active instanceof Set)) throw new Error("Missing URL observer");
    return active.size;
  });
}

test("optional load failure is readable and core remains usable; reset cancels pending SVG generation", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.route("**/assets/optional-*.js", (route) => route.abort());
    await page.goto(app.url);
    await page.getByLabel("Example", { exact: true }).selectOption("svg");
    await page.getByRole("button", { name: "Generate PDF" }).click();
    await page.getByRole("status").filter({ hasText: "Generation failed:" }).waitFor();
    await page.getByLabel("Example", { exact: true }).selectOption("text");
    await page.getByRole("button", { name: "Generate PDF" }).click();
    assert.deepEqual(await pdf(page), textDemo(title));
    const slow = await app.browser.newPage();
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await slow.route("**/assets/optional-*.js", async (route) => {
      await pending;
      await route.continue();
    });
    await slow.goto(app.url);
    await slow.getByLabel("Example", { exact: true }).selectOption("svg");
    const request = slow.waitForRequest("**/assets/optional-*.js");
    await slow.getByRole("button", { name: "Generate PDF" }).click();
    const requested = await request;
    await slow.getByRole("button", { name: "Reset", exact: true }).click();
    release?.();
    await slow.evaluate(async (url) => {
      await import(url);
    }, requested.url());
    assert.equal(await slow.locator("#output").isVisible(), false);
    assert.match(await slow.getByRole("status").innerText(), /^Ready/);
    await slow.getByRole("button", { name: "Generate PDF" }).click();
    assert.deepEqual(await pdf(slow), textDemo(title));
    await source(slow, "text.ts");
  } finally {
    await app.close();
  }
});
