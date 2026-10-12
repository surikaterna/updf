import assert from "node:assert/strict";
import test from "node:test";
import { pageErrors, pdf, site } from "./helpers.js";

test("missing native compression is explicit and retains the previous PDF without a polyfill", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.addInitScript(() => Reflect.deleteProperty(globalThis, "DecompressionStream"));
    await page.goto(app.url);
    const original = await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("png");
    assert.deepEqual(await pdf(page), original);
    assert.match(await page.locator("#status").innerText(), /PNG_PLATFORM.*native CompressionStream/u);
    await page.getByLabel("Example", { exact: true }).selectOption("text");
    assert.deepEqual(await pdf(page), original);
  } finally {
    await app.close();
  }
});

test("switching during native PNG compression cancels preparation without stale cache or unhandled errors", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    const errors = pageErrors(page);
    await page.addInitScript({
      content: `
      const Native = CompressionStream; let calls = 0;
      globalThis.pngCodecStarted = false;
      Object.defineProperty(globalThis, 'CompressionStream', { value: class {
        constructor(format) {
          const stream = ++calls > 1 ? new Native(format) : { readable: new ReadableStream(), writable: new WritableStream() };
          globalThis.pngCodecStarted = true;
          this.readable = stream.readable; this.writable = stream.writable;
        }
      }});
    `,
    });
    await page.goto(app.url);
    const original = await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("png");
    await page.waitForFunction(() => Reflect.get(globalThis, "pngCodecStarted"));
    await page.getByLabel("Example", { exact: true }).selectOption("text");
    assert.deepEqual(await pdf(page), original);
    await page.getByLabel("Example", { exact: true }).selectOption("png");
    await pdf(page);
    assert.match(await page.locator("#status").innerText(), /color PNG with alpha/u);
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});
