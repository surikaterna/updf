import assert from "node:assert/strict";
import test from "node:test";
import { pageErrors, site } from "./helpers.js";
import { measurements, plasmaWorkers, playing } from "./plasma-helpers.js";

test("hidden tab auto-pauses and requires explicit resume", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.goto(`${app.url}plasma.html`);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await playing(page);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const paused = await measurements(page);
    assert.equal(paused.state, "paused");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(200);
    assert.equal((await measurements(page)).presented, paused.presented);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await playing(page, paused.presented + 2);
  } finally {
    await app.close();
  }
});

test("empty, fractional and out-of-range buffer settings never create workers", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await plasmaWorkers(page);
    await page.goto(`${app.url}plasma.html`);
    for (const value of ["", "0", "51", "1.5"]) {
      await page.getByLabel("Extra buffered frames (1–50)").fill(value);
      await page.getByRole("button", { name: "Play", exact: true }).click();
      assert.equal(await page.evaluate(() => Reflect.get(window, "createdWorkers")), 0);
    }
    await page.getByLabel("Extra buffered frames (1–50)").fill("1");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await playing(page);
  } finally {
    await app.close();
  }
});

test("readiness timeout terminates a stalled worker even while its response stays held", async () => {
  const app = await site();
  let release: (() => void) | undefined;
  try {
    const page = await app.browser.newPage();
    const errors = pageErrors(page);
    await plasmaWorkers(page);
    await page.addInitScript(() => {
      const native = window.setTimeout.bind(window);
      Reflect.set(window, "setTimeout", (handler: TimerHandler, timeout?: number, ...args: unknown[]) =>
        native(handler, timeout === 10000 ? 150 : timeout, ...args),
      );
    });
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/assets/pdf.worker.min-*.mjs", async (route) => {
      await held;
      await route.continue();
    });
    await page.goto(`${app.url}plasma.html`);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page
      .getByRole("status")
      .filter({ hasText: /readiness timed out/ })
      .waitFor();
    assert.equal(await page.evaluate(() => Reflect.get(window, "liveWorkers")), 0);
    assert.deepEqual(errors, []);
  } finally {
    release?.();
    await app.close();
  }
});

test("reset releases worker through bounded fallback when document teardown never acknowledges", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    const errors = pageErrors(page);
    await plasmaWorkers(page);
    await page.addInitScript(() => {
      const native = Worker.prototype.postMessage;
      Worker.prototype.postMessage = function (...args) {
        if (args[0]?.action === "Terminate") {
          Reflect.set(window, "heldDocumentTeardown", true);
          return;
        }
        Reflect.apply(native, this, args);
      };
    });
    await page.goto(`${app.url}plasma.html`);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.waitForFunction(() => Reflect.get(window, "heldDocumentTeardown") === true);
    assert.equal(await page.evaluate(() => Reflect.get(window, "liveWorkers")), 1);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await page.waitForFunction(() => Reflect.get(window, "liveWorkers") === 0, null, { timeout: 3000 });
    assert.equal(await page.locator("canvas").count(), 0);
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

test("reset during active rasterization suppresses late pixels and canvas failures surface", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    const errors = pageErrors(page);
    await plasmaWorkers(page);
    await page.goto(`${app.url}plasma.html`);
    await page.evaluate(() => {
      const native = requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) => {
        window.requestAnimationFrame = native;
        Reflect.set(window, "releaseRaster", () => callback(performance.now()));
        return native(() => {});
      };
    });
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.waitForFunction(() => typeof Reflect.get(window, "releaseRaster") === "function", null, { polling: 10 });
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await page.waitForFunction(() => Reflect.get(window, "liveWorkers") === 0, null, { polling: 10, timeout: 3000 });
    await page.evaluate(() => Reflect.get(window, "releaseRaster")());
    await page.waitForTimeout(100);
    assert.equal(await page.locator("canvas").count(), 0);
    await page.evaluate(() => {
      HTMLCanvasElement.prototype.getContext = () => {
        throw new Error("Injected plasma raster failure");
      };
    });
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page
      .getByRole("status")
      .filter({ hasText: /Injected plasma raster failure/ })
      .waitFor();
    await page.waitForFunction(() => Reflect.get(window, "liveWorkers") === 0);
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

for (const renderingFails of [true, false]) {
  test(`stalled production cleanup surfaces ${renderingFails ? "original rendering failure" : "timeout"} without Reset`, async () => {
    const app = await site();
    try {
      const page = await app.browser.newPage();
      const errors = pageErrors(page);
      await plasmaWorkers(page);
      await stallProductionCleanup(page, renderingFails);
      await page.goto(`${app.url}plasma.html`);
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.waitForFunction(() => Reflect.get(window, "heldDocumentTeardown") === true, null, { polling: 10 });
      const diagnostic = renderingFails ? /Injected plasma raster failure/ : /PDF document cleanup timed out/;
      await page.getByRole("status").filter({ hasText: diagnostic }).waitFor({ timeout: 3000 });
      assert.equal(await page.evaluate(() => Reflect.get(window, "liveWorkers")), 0);
      const data = await measurements(page);
      assert.equal(data.state, "error");
      assert.equal(data.inFlight, false);
      assert.equal(data.produced, 0);
      assert.equal(data.queue, 0);
      assert.equal(await page.locator("canvas").count(), 0);
      assert.equal(await page.getByRole("button", { name: "Play", exact: true }).isDisabled(), true);
      await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => Reflect.get(window, "createdWorkers")), 1);
      assert.deepEqual(errors, []);
    } finally {
      await app.close();
    }
  });
}

async function stallProductionCleanup(page: import("playwright").Page, renderingFails: boolean): Promise<void> {
  await page.addInitScript((fail) => {
    const native = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (...args) {
      if (args[0]?.action === "Terminate") {
        Reflect.set(window, "heldDocumentTeardown", true);
        return;
      }
      Reflect.apply(native, this, args);
    };
    if (fail) {
      HTMLCanvasElement.prototype.getContext = () => {
        throw new Error("Injected plasma raster failure");
      };
    }
  }, renderingFails);
}
