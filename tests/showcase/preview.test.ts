import assert from "node:assert/strict";
import test from "node:test";
import { textDemo } from "../../apps/showcase/src/text.js";
import { observeUrls, pageErrors, pdf, rendered, site } from "./helpers.js";

test("debounced edits retain matched old output, publish latest pixels and dispose workers", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    const errors = pageErrors(page);
    await observeUrls(page);
    await observeWorkers(page);
    await page.goto(app.url);
    const original = await rendered(page);
    await blueTextPanel(page);
    const href = await page.locator("#download").getAttribute("href");
    await page.getByLabel("PDF title", { exact: true }).fill("Discard this edit");
    assert.equal(await page.locator("#download").getAttribute("href"), href);
    assert.match(await page.getByRole("status").innerText(), /Previous PDF remains/);
    await page.getByLabel("PDF title", { exact: true }).fill("IIII");
    assert.deepEqual(await pdf(page), textDemo("IIII"));
    assert.notDeepEqual(await rendered(page), original);
    assert.equal(await page.evaluate(() => Reflect.get(window, "liveWorkers")), 0);
    assert.equal(await page.evaluate(() => Reflect.get(window, "activePdfUrls").size), 1);
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

test("stale lazy renderer load never publishes; pagehide suppresses pending work", async () => {
  const app = await site();
  let release: (() => void) | undefined;
  try {
    const page = await app.browser.newPage();
    const errors = pageErrors(page);
    await observeUrls(page);
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/assets/preview-*.js", async (route) => {
      await pending;
      await route.continue();
    });
    const request = page.waitForRequest("**/assets/preview-*.js");
    await page.goto(app.url);
    await request;
    await page.getByLabel("PDF title", { exact: true }).fill("Latest lazy title");
    await page.getByRole("button", { name: "Generate PDF" }).click();
    release?.();
    assert.deepEqual(await pdf(page), textDemo("Latest lazy title"));
    await rendered(page);
    await page.getByLabel("PDF title", { exact: true }).fill("Must not publish");
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await page.waitForTimeout(450);
    assert.equal(await page.locator("#output").isVisible(), false);
    assert.equal(await page.evaluate(() => Reflect.get(window, "activePdfUrls").size), 0);
    await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
    assert.deepEqual(await pdf(page), textDemo("Must not publish"));
    await rendered(page);
    assert.deepEqual(errors, []);
  } finally {
    release?.();
    await app.close();
  }
});

test("render failure removes old canvases and offers the newly generated PDF", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    const errors = pageErrors(page);
    await page.goto(app.url);
    await rendered(page);
    await page.evaluate(() => {
      HTMLCanvasElement.prototype.getContext = () => {
        throw new Error("Injected renderer failure");
      };
    });
    await page.getByLabel("PDF title", { exact: true }).fill("Fallback title");
    assert.deepEqual(await pdf(page), textDemo("Fallback title"));
    assert.equal(await page.locator("#preview canvas").count(), 0);
    assert.match(await page.getByRole("status").innerText(), /preview failed.*new PDF/);
    const popup = page.waitForEvent("popup");
    await page.locator("#open").click();
    const opened = await popup;
    await opened.waitForLoadState();
    assert.match(opened.url(), /^blob:/);
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

async function observeWorkers(page: import("playwright").Page): Promise<void> {
  await page.addInitScript(() => {
    const NativeWorker = Worker;
    Object.assign(window, { liveWorkers: 0 });
    window.Worker = class extends NativeWorker {
      private ended = false;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        Reflect.set(window, "liveWorkers", Reflect.get(window, "liveWorkers") + 1);
      }
      override terminate(): void {
        if (!this.ended) Reflect.set(window, "liveWorkers", Reflect.get(window, "liveWorkers") - 1);
        this.ended = true;
        super.terminate();
      }
    };
  });
}

test("cancel pending PDF.js document load without replacing previous or latest output", async () => {
  const app = await site();
  let release: (() => void) | undefined;
  try {
    const page = await app.browser.newPage();
    const errors = pageErrors(page);
    await observeWorkers(page);
    await page.goto(app.url);
    await rendered(page);
    const previous = await page.locator("#download").getAttribute("href");
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(
      "**/assets/pdf.worker.min-*.mjs",
      async (route) => {
        await pending;
        await route.continue();
      },
      { times: 1 },
    );
    const request = page.waitForRequest("**/assets/pdf.worker.min-*.mjs");
    await page.getByLabel("Example", { exact: true }).selectOption("template");
    await request;
    assert.equal(await page.locator("#download").getAttribute("href"), previous);
    assert.equal(await page.locator("#preview canvas").count(), 1);
    await page.getByLabel("PDF title", { exact: true }).fill("Latest document");
    await page.getByLabel("Example", { exact: true }).selectOption("text");
    assert.deepEqual(await pdf(page), textDemo("Latest document"));
    assert.equal(await page.evaluate(() => Reflect.get(window, "liveWorkers")), 0);
    release?.();
    await page.waitForTimeout(100);
    await rendered(page);
    assert.deepEqual(await pdf(page), textDemo("Latest document"));
    assert.equal(await page.evaluate(() => Reflect.get(window, "liveWorkers")), 0);
    assert.deepEqual(errors, []);
  } finally {
    release?.();
    await app.close();
  }
});

test("cancel an active canvas render; its delayed frame cannot overwrite latest pages", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    const errors = pageErrors(page);
    await observeWorkers(page);
    await page.goto(app.url);
    await rendered(page);
    await holdRenderFrame(page);
    await page.waitForFunction(() => typeof Reflect.get(window, "releaseRenderFrame") === "function", null, {
      polling: 10,
    });
    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>("#title");
      if (!input) throw new Error("Missing title");
      input.value = "Newest after cancellation";
      input.dispatchEvent(new Event("input"));
      document.querySelector<HTMLFormElement>("#demo-form")?.requestSubmit();
    });
    assert.deepEqual(await pdf(page), textDemo("Newest after cancellation"));
    await page.evaluate(() => Reflect.get(window, "releaseRenderFrame")());
    await page.waitForTimeout(100);
    await rendered(page);
    assert.deepEqual(await pdf(page), textDemo("Newest after cancellation"));
    assert.equal(await page.evaluate(() => Reflect.get(window, "liveWorkers")), 0);
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

async function holdRenderFrame(page: import("playwright").Page): Promise<void> {
  await page.evaluate(() => {
    const native = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      window.requestAnimationFrame = native;
      Reflect.set(window, "releaseRenderFrame", () => callback(performance.now()));
      return native(() => {});
    };
    const input = document.querySelector<HTMLInputElement>("#title");
    if (!input) throw new Error("Missing title");
    input.value = "Cancel active render";
    document.querySelector<HTMLFormElement>("#demo-form")?.requestSubmit();
  });
}

async function blueTextPanel(page: import("playwright").Page): Promise<void> {
  const pixel = await page.locator("#preview canvas").evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error("Expected canvas");
    const context = element.getContext("2d");
    if (!context) throw new Error("Missing context");
    return Array.from(
      context.getImageData(Math.floor(element.width * 0.1), Math.floor(element.height * 0.1), 1, 1).data,
    );
  });
  assert.ok((pixel[0] ?? 0) >= 225 && (pixel[0] ?? 0) <= 235);
  assert.ok((pixel[1] ?? 0) >= 240 && (pixel[1] ?? 0) <= 250);
  assert.ok((pixel[2] ?? 0) >= 250);
  assert.equal(pixel[3], 255);
}

test("worker load failure still makes the generated PDF downloadable", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.route("**/assets/pdf.worker.min-*.mjs", (route) => route.abort());
    await page.goto(app.url);
    assert.deepEqual(await pdf(page), textDemo("Hello portable PDF"));
    assert.equal(await page.locator("#preview canvas").count(), 0);
    assert.match(await page.getByRole("status").innerText(), /preview failed/);
  } finally {
    await app.close();
  }
});

test("superseded initializing workers and pagehide clean up while responses remain held", async () => {
  const app = await site();
  let release: (() => void) | undefined;
  try {
    const page = await app.browser.newPage();
    const errors = pageErrors(page);
    await observeWorkers(page);
    await observeUrls(page);
    await page.goto(app.url);
    await rendered(page);
    const previous = await page.locator("#download").getAttribute("href");
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(
      "**/assets/pdf.worker.min-*.mjs",
      async (route) => {
        await held;
        await route.continue();
      },
      { times: 3 },
    );
    for (let generation = 0; generation < 3; generation += 1) {
      const request = page.waitForRequest("**/assets/pdf.worker.min-*.mjs");
      await page.getByRole("button", { name: "Generate PDF" }).click();
      await request;
      assert.equal(await page.evaluate(() => Reflect.get(window, "liveWorkers")), 1);
      assert.equal(await page.locator("#download").getAttribute("href"), previous);
      assert.equal(await page.locator("#preview canvas").count(), 1);
    }
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    assert.equal(await page.evaluate(() => Reflect.get(window, "liveWorkers")), 0);
    assert.equal(await page.evaluate(() => Reflect.get(window, "activePdfUrls").size), 0);
    assert.equal(await page.locator("#output").isVisible(), false);
    release?.();
    await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
    assert.deepEqual(await pdf(page), textDemo("Hello portable PDF"));
    await rendered(page);
    assert.deepEqual(errors, []);
  } finally {
    release?.();
    await app.close();
  }
});

test("an obsolete render promise settles without waiting for worker readiness", async () => {
  const app = await site();
  let release: (() => void) | undefined;
  try {
    const page = await app.browser.newPage();
    await observeWorkers(page);
    const module = page.waitForRequest("**/assets/preview-*.js");
    await page.goto(app.url);
    const rendererUrl = (await module).url();
    await rendered(page);
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/assets/pdf.worker.min-*.mjs", async (route) => {
      await held;
      await route.continue();
    });
    const request = page.waitForRequest("**/assets/pdf.worker.min-*.mjs");
    await page.evaluate(
      async ({ url, bytes }) => {
        const { CanvasPreview } = await import(url);
        const renderer = new CanvasPreview();
        Reflect.set(window, "cancelPreview", () => renderer.cancel());
        Reflect.set(window, "obsoleteRender", "pending");
        void renderer.render(new Uint8Array(bytes), 300).then(
          (result: unknown) => Reflect.set(window, "obsoleteRender", result === undefined ? "cancelled" : "published"),
          () => Reflect.set(window, "obsoleteRender", "rejected"),
        );
      },
      { url: rendererUrl, bytes: Array.from(textDemo("Cancel initialization")) },
    );
    await request;
    await page.evaluate(() => Reflect.get(window, "cancelPreview")());
    await page.waitForFunction(() => Reflect.get(window, "obsoleteRender") === "cancelled", null, { timeout: 1000 });
    assert.equal(await page.evaluate(() => Reflect.get(window, "liveWorkers")), 0);
  } finally {
    release?.();
    await app.close();
  }
});
