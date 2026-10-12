import assert from "node:assert/strict";
import test from "node:test";
import { pdf, settledModule, site } from "./helpers.js";

test("leaving a stalled PNG cancels it and returning starts a fresh request", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    let requests = 0;
    await page.route("**/color-alpha-*.png", (route) => {
      if (++requests > 1) return route.continue();
    });
    await page.goto(app.url);
    await pdf(page);
    const request = page.waitForRequest("**/color-alpha-*.png");
    await page.getByLabel("Example", { exact: true }).selectOption("png");
    await request;
    const aborted = page.waitForEvent("requestfailed", (event) => /color-alpha-/u.test(event.url()));
    await page.getByLabel("Example", { exact: true }).selectOption("text");
    await aborted;
    await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("png");
    await pdf(page);
    assert.equal(requests, 2);
    assert.match(await page.locator("#status").innerText(), /color PNG with alpha/u);
  } finally {
    await app.close();
  }
});

test("reset aborts a stalled PNG and retries without caching the pending request", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    let requests = 0;
    await page.route("**/color-alpha-*.png", (route) => {
      if (++requests > 1) return route.continue();
    });
    await page.goto(app.url);
    await pdf(page);
    const request = page.waitForRequest("**/color-alpha-*.png");
    await page.getByLabel("Example", { exact: true }).selectOption("png");
    await request;
    await page.getByRole("button", { name: "Reset demo", exact: true }).click();
    const recovered = await pdf(page);
    assert.equal(requests, 2);
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    assert.deepEqual(await pdf(page), recovered);
    assert.equal(requests, 2);
  } finally {
    await app.close();
  }
});

test("PNG timeout retains the previous result and an explicit retry recovers", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.clock.install();
    let requests = 0;
    await page.route("**/color-alpha-*.png", (route) => {
      if (++requests > 1) return route.continue();
    });
    await page.goto(app.url);
    const original = await pdf(page);
    const source = await page.locator("#source").textContent();
    const request = page.waitForRequest("**/color-alpha-*.png");
    await page.getByLabel("Example", { exact: true }).selectOption("png");
    await request;
    await page.clock.fastForward(10001);
    assert.deepEqual(await pdf(page), original);
    assert.equal(await page.locator("#source").textContent(), source);
    assert.match(await page.locator("#status").innerText(), /timed out/u);
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    await pdf(page);
    assert.equal(requests, 2);
    assert.match(await page.locator("#status").innerText(), /color PNG with alpha/u);
  } finally {
    await app.close();
  }
});

test("a late PNG module cannot start an asset request after switching examples", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    const images: string[] = [];
    page.on("request", (request) => {
      if (/-alpha-.*\.png/u.test(request.url())) images.push(request.url());
    });
    let release: (() => Promise<void>) | undefined;
    await page.route("**/optional-png-*.js", (route) => {
      release = () => route.continue();
    });
    await page.goto(app.url);
    const original = await pdf(page);
    const request = page.waitForRequest("**/optional-png-*.js");
    await page.getByLabel("Example", { exact: true }).selectOption("png");
    await request;
    await page.getByLabel("Example", { exact: true }).selectOption("text");
    await pdf(page);
    assert.ok(release);
    await release();
    await settledModule(page, request);
    assert.deepEqual(await pdf(page), original);
    assert.deepEqual(images, []);
  } finally {
    await app.close();
  }
});
