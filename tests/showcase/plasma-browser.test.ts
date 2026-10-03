import assert from "node:assert/strict";
import test from "node:test";
import { pageErrors, site } from "./helpers.js";
import { measurements, pixels, plasmaWorkers, playing } from "./plasma-helpers.js";

test("plasma lazy loads under /updf/, changes actual PDF pixels with one persistent worker", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
    const errors = pageErrors(page);
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await plasmaWorkers(page);
    await page.goto(`${app.url}plasma.html`);
    assert.ok(!requests.some((url) => /renderer-|pdf.worker/.test(url)));
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await playing(page);
    const first = await pixels(page);
    await playing(page, 40);
    assert.notDeepEqual(await pixels(page), first);
    assert.equal(await page.evaluate(() => Reflect.get(window, "createdWorkers")), 1);
    assert.equal(await page.evaluate(() => Reflect.get(window, "liveWorkers")), 1);
    assert.ok(requests.filter((url) => /assets\//.test(url)).every((url) => url.includes("/updf/assets/")));
    assert.deepEqual(
      await page.evaluate(() => {
        const c = document.querySelector("#screen canvas");
        if (!(c instanceof HTMLCanvasElement)) throw new Error("Expected canvas");
        return [c.width, c.height];
      }),
      [320, 200],
    );
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    const paused = await measurements(page);
    await page.waitForTimeout(150);
    assert.equal((await measurements(page)).presented, paused.presented);
    assert.ok((await measurements(page)).queue <= 10);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await playing(page, paused.presented + 3);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await page.waitForFunction(() => Reflect.get(window, "liveWorkers") === 0);
    assert.equal(await page.locator("canvas").count(), 0);
    assert.equal(await page.getByLabel("Extra buffered frames (1–50)").isEnabled(), true);
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

test("500 pixel samples read the current canvas atomically throughout active playback", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    const errors = pageErrors(page);
    await page.goto(`${app.url}plasma.html`);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await playing(page);
    const before = await measurements(page);
    const signatures = new Set<string>();
    for (let sample = 0; sample < 500; sample += 1) {
      const data = await pixels(page, { width: 8, height: 8 });
      assert.equal(data.length, 8 * 8 * 4);
      assert.equal(data[3], 255);
      signatures.add(data.slice(0, 64).join(","));
    }
    const after = await measurements(page);
    assert.equal(after.state, "playing");
    assert.ok(after.presented > before.presented);
    assert.ok(signatures.size > 1, "Expected changing opaque PDF pixels while sampling");
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

test("reset cancels initializing worker before held network releases; restoration is stopped", async () => {
  const app = await site();
  let release: (() => void) | undefined;
  try {
    const page = await app.browser.newPage();
    await plasmaWorkers(page);
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/assets/pdf.worker.min-*.mjs", async (route) => {
      await held;
      await route.continue();
    });
    await page.goto(`${app.url}plasma.html`);
    const request = page.waitForRequest("**/assets/pdf.worker.min-*.mjs");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await request;
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    assert.equal(await page.evaluate(() => Reflect.get(window, "liveWorkers")), 0);
    release?.();
    await page.waitForTimeout(100);
    assert.equal(await page.locator("canvas").count(), 0);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await playing(page);
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await page.waitForFunction(() => Reflect.get(window, "liveWorkers") === 0);
    await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
    assert.match(await page.getByRole("status").innerText(), /Stopped/);
  } finally {
    release?.();
    await app.close();
  }
});

test("stale renderer import cannot start a reset session; worker failures are readable", async () => {
  const app = await site();
  let release: (() => void) | undefined;
  try {
    const page = await app.browser.newPage();
    await plasmaWorkers(page);
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
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    release?.();
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => Reflect.get(window, "createdWorkers")), 0);
    await page.route("**/assets/pdf.worker.min-*.mjs", (route) => route.abort());
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page
      .getByRole("status")
      .filter({ hasText: /Error: PDF worker failed/ })
      .waitFor();
    await page.waitForFunction(() => Reflect.get(window, "liveWorkers") === 0);
  } finally {
    release?.();
    await app.close();
  }
});
