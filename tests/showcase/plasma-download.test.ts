import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { Page } from "playwright";
import { plasmaPDF, plasmaSVG } from "../../apps/showcase/src/plasma/frame.js";
import { observeUrls, pageErrors, site } from "./helpers.js";
import { measurements, playing } from "./plasma-helpers.js";

const control = (page: Page) => page.getByRole("button", { name: "Download current frame (PDF)", exact: true });
const active = (page: Page) => page.evaluate(() => Reflect.get(window, "activePdfUrls").size as number);

async function capture(page: Page): Promise<number> {
  const event = page.waitForEvent("download");
  const captured = await page.evaluate(() => {
    const data = JSON.parse(document.querySelector("#metrics")?.textContent ?? "{}");
    const canvas = document.querySelector<HTMLCanvasElement>("#screen canvas");
    const context = canvas?.getContext("2d");
    if (!context) throw new Error("Missing displayed canvas");
    const colors = Array.from({ length: 640 }, (_, i) =>
      Array.from(context.getImageData((i % 32) * 10 + 5, Math.floor(i / 32) * 10 + 5, 1, 1).data),
    );
    document.querySelector<HTMLButtonElement>("#download")?.click();
    return { ...data, colors };
  });
  const download = await event;
  assert.equal(download.suggestedFilename(), `plasma-frame-${captured.index}.pdf`);
  const path = await download.path();
  assert.ok(path);
  assert.deepEqual(new Uint8Array(await readFile(path)), plasmaPDF(captured.index));
  const colors = [...plasmaSVG(captured.index).matchAll(/fill="#([0-9a-f]{6})"/g)].map((match) => {
    const hex = match[1] ?? "";
    return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)).concat(255);
  });
  assert.deepEqual(captured.colors, colors, "Downloaded vector cell colors match the displayed PDF pixels");
  assert.ok(captured.produced > captured.index + 1, "There are different queued/in-flight frame indices");
  return captured.index;
}

test("download captures the displayed vector PDF atomically while playing and paused", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    const errors = pageErrors(page);
    await observeUrls(page);
    await page.goto(`${app.url}plasma.html`);
    assert.equal(await control(page).isDisabled(), true);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await playing(page);
    const first = await capture(page);
    assert.equal((await measurements(page)).state, "playing");
    await playing(page, first + 4);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    const paused = await measurements(page);
    assert.equal(await capture(page), paused.index);
    assert.equal(await capture(page), paused.index);
    assert.equal(await active(page), 3);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    assert.equal(await control(page).isDisabled(), true);
    assert.equal(await active(page), 3, "Reset allows asynchronous download consumption before revoking");
    await page.waitForFunction(() => Reflect.get(window, "activePdfUrls").size === 0);
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

test("download URLs are bounded, expire, and clear on page exit", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await observeUrls(page);
    await page.addInitScript(() => {
      const native = window.setTimeout.bind(window);
      Reflect.set(window, "setTimeout", (handler: TimerHandler, timeout?: number, ...args: unknown[]) =>
        native(handler, timeout === 30000 ? 3000 : timeout, ...args),
      );
    });
    await page.goto(`${app.url}plasma.html`);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await playing(page);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page.evaluate(() => {
      for (let i = 0; i < 12; i += 1) document.querySelector<HTMLButtonElement>("#download")?.click();
    });
    assert.equal(await active(page), 8);
    assert.equal(await control(page).isDisabled(), true);
    await page.waitForFunction(() => Reflect.get(window, "activePdfUrls").size === 0);
    assert.equal(await control(page).isEnabled(), true);
    await capture(page);
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    assert.equal(await active(page), 0);
    assert.equal(await control(page).isDisabled(), true);
    await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
    assert.equal(await control(page).isDisabled(), true);
  } finally {
    await app.close();
  }
});

test("export failure does not corrupt playback; a pipeline error disables and retires downloads", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    const errors = pageErrors(page);
    await observeUrls(page);
    await page.goto(`${app.url}plasma.html`);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await playing(page);
    await capture(page);
    await page.evaluate(() => {
      const native = URL.createObjectURL;
      URL.createObjectURL = () => {
        URL.createObjectURL = native;
        throw new Error("Injected export failure");
      };
      document.querySelector<HTMLButtonElement>("#download")?.click();
    });
    assert.match(await page.locator("#download-status").innerText(), /Download failed: Injected export failure/);
    const before = await measurements(page);
    await playing(page, before.presented + 2);
    await page.evaluate(() => {
      HTMLCanvasElement.prototype.getContext = () => {
        throw new Error("Injected pipeline failure");
      };
    });
    await page
      .locator("#status")
      .filter({ hasText: /Injected pipeline failure/ })
      .waitFor();
    assert.equal(await control(page).isDisabled(), true);
    await page.waitForFunction(() => Reflect.get(window, "activePdfUrls").size === 0);
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

test("loading, prefill and reset never expose a download of an undisplayed frame", async () => {
  const app = await site();
  let release: (() => void) | undefined;
  try {
    const page = await app.browser.newPage();
    await observeUrls(page);
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/assets/renderer-*.js", async (route) => {
      await held;
      await route.continue();
    });
    await page.goto(`${app.url}plasma.html`);
    const request = page.waitForRequest("**/assets/renderer-*.js");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await request;
    assert.equal(await control(page).isDisabled(), true);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    release?.();
    await page.waitForTimeout(100);
    assert.equal(await control(page).isDisabled(), true);
    await page.getByLabel("Extra buffered frames (1–50)").fill("50");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.waitForFunction(() => {
      const text = document.querySelector("#metrics")?.textContent;
      return text?.startsWith("{") && JSON.parse(text).produced > 0;
    });
    assert.equal((await measurements(page)).presented, 0);
    assert.equal(await control(page).isDisabled(), true);
    assert.equal(await active(page), 0);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    assert.equal(await control(page).isDisabled(), true);
  } finally {
    release?.();
    await app.close();
  }
});
