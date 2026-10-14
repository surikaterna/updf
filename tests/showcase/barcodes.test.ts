import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { Page } from "playwright";
import { code39Defaults, qrDefaults } from "../../apps/showcase/src/barcode-controls.js";
import { code39Demo } from "../../apps/showcase/src/code39.js";
import { qrDemo } from "../../apps/showcase/src/qr.js";
import { observeUrls, pageErrors, pdf, rendered, retained, screenshot, site } from "./helpers.js";

const title = "Hello portable PDF";
async function sources(page: Page, name: "code39" | "qr"): Promise<void> {
  const source = await page.locator("#source").textContent();
  for (const file of [`${name}.tsx`, "barcode-controls.ts", "barcode-page.tsx", "text-options.ts"])
    assert.ok(source?.includes(await readFile(new URL(`../../apps/showcase/src/${file}`, import.meta.url), "utf8")));
}

test("Code 39 showcase is lazy, editable, deterministic and retains output on invalid/oversized symbols", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 1100, height: 900 } });
    const requests: string[] = [],
      errors = pageErrors(page);
    page.on("request", (request) => requests.push(request.url()));
    await observeUrls(page);
    await page.goto(app.url);
    await pdf(page);
    assert.ok(!requests.some((url) => /optional-(code39|qr)-/u.test(url)));
    await page.getByLabel("Example", { exact: true }).selectOption("code39");
    assert.deepEqual(await pdf(page), code39Demo(title).bytes);
    assert.ok(!requests.some((url) => /optional-qr-/u.test(url)));
    await sources(page, "code39");
    await page.getByLabel("Code 39 checksum", { exact: true }).selectOption("mod43");
    const expected = code39Demo(title, { ...code39Defaults, checksum: "mod43" }).bytes;
    assert.deepEqual(await pdf(page), expected);
    const args = await page.locator("#source-arguments").textContent();
    await page.getByLabel("Code 39 payload", { exact: true }).fill("lowercase");
    assert.deepEqual(await pdf(page), expected);
    assert.match(await page.locator("#status").innerText(), /Unsupported.*payload/u);
    assert.equal(await page.locator("#source-arguments").textContent(), args);
    await page.getByLabel("Code 39 payload", { exact: true }).fill("A".repeat(80));
    assert.deepEqual(await pdf(page), expected);
    assert.match(await page.locator("#status").innerText(), /does not fit/u);
    await page.getByRole("button", { name: "Reset demo", exact: true }).click();
    assert.deepEqual(await pdf(page), code39Demo(title).bytes);
    await rendered(page);
    await retained(page);
    await screenshot(page, "code39-desktop");
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

test("QR showcase M/H and sizing match Node, never fetch the payload, and recover after capacity errors", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    const requests: string[] = [],
      errors = pageErrors(page);
    page.on("request", (request) => requests.push(request.url()));
    await observeUrls(page);
    await page.goto(app.url);
    await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("qr");
    assert.deepEqual(await pdf(page), qrDemo(title).bytes);
    await sources(page, "qr");
    await page.getByLabel("QR error correction", { exact: true }).selectOption("H");
    await page.getByLabel("QR module size (points)", { exact: true }).fill("4");
    const expected = qrDemo(title, { ...qrDefaults, errorCorrection: "H", moduleSize: 4 }).bytes;
    assert.deepEqual(await pdf(page), expected);
    assert.match(await page.locator("#status").innerText(), /QR H/u);
    const args = await page.locator("#source-arguments").textContent();
    await page.getByLabel("QR payload", { exact: true }).fill("x".repeat(120));
    assert.deepEqual(await pdf(page), expected);
    assert.match(await page.locator("#status").innerText(), /Maximum 119/u);
    assert.equal(await page.locator("#source-arguments").textContent(), args);
    await page.getByRole("button", { name: "Reset demo", exact: true }).click();
    assert.deepEqual(await pdf(page), qrDemo(title).bytes);
    await page.setViewportSize({ width: 320, height: 812 });
    await page.waitForFunction(() => document.querySelector("#demo-form")?.getAttribute("aria-busy") === "true");
    await pdf(page);
    await rendered(page);
    await retained(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await screenshot(page, "qr-mobile");
    assert.ok(!requests.some((url) => /example\.com|qrcode-generator|optional-code39-/u.test(url)));
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

test("Late barcode module imports cannot replace the newly selected example", async () => {
  const app = await site();
  let release: (() => void) | undefined;
  try {
    const page = await app.browser.newPage();
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.goto(app.url);
    const original = await pdf(page);
    await page.route("**/optional-qr-*.js", async (route) => {
      await held;
      await route.continue();
    });
    const request = page.waitForRequest("**/optional-qr-*.js");
    await page.getByLabel("Example", { exact: true }).selectOption("qr");
    await request;
    await page.getByLabel("Example", { exact: true }).selectOption("text");
    assert.deepEqual(await pdf(page), original);
    release!();
    await page.evaluate(async (url) => {
      await import(url);
    }, (await request).url());
    assert.equal(await page.locator("#qr-controls").isVisible(), false);
    assert.deepEqual(await pdf(page), original);
    assert.match((await page.locator("#source-state").textContent()) ?? "", /Positioned text/u);
  } finally {
    release?.();
    await app.close();
  }
});
