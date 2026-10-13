import assert from "node:assert/strict";
import test from "node:test";
import { argumentsFor, coldFontkite, expectedPdf, fontkitChunks, switchRemoteEngines } from "./font-engine-helpers.js";
import { observeUrls, pageErrors, pdf, rendered, retained, screenshot, settledModule, site } from "./helpers.js";

test("explicit cold Fontkite selection loads no Fontkit, then engine changes reuse bytes and reset restores Fontkit", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 1100, height: 900 } });
    const requests: string[] = [],
      errors = pageErrors(page),
      kitFiles = await fontkitChunks();
    page.on("request", (request) => requests.push(request.url()));
    await observeUrls(page);
    await coldFontkite(page, app.url);
    assert.ok(!requests.some((url) => kitFiles.some((file) => url.endsWith(file))));
    assert.match(await page.locator("#status").innerText(), /Fontkite; preparation [\d.]+ ms/u);
    await switchRemoteEngines(page);
    assert.ok(
      requests.some((url) => kitFiles.some((file) => url.endsWith(file))),
      "Fontkit loads when explicitly selected",
    );
    await rendered(page);
    await retained(page);
    await screenshot(page, "font-engines-desktop");
    await page.setViewportSize({ width: 320, height: 812 });
    await page.waitForFunction(() => document.querySelector("#demo-form")?.getAttribute("aria-busy") === "true");
    await pdf(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await screenshot(page, "font-engines-mobile");
    await page.getByRole("button", { name: "Reset demo", exact: true }).click();
    assert.deepEqual(await pdf(page), await expectedPdf("fontkit"));
    assert.equal(await page.getByLabel("Font engine", { exact: true }).inputValue(), "fontkit");
    assert.deepEqual(await argumentsFor(page), { engine: "fontkit", uri: "", fontSize: 18 });
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

test("a failed engine import preserves the active font and later edits do not retry the failed selection", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.goto(app.url);
    await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("font-uri");
    const original = await pdf(page),
      args = await argumentsFor(page);
    let requests = 0;
    await page.route("**/font-engine-fontkite-*.js", (route) => {
      requests++;
      return route.abort();
    });
    await page.getByLabel("Font engine", { exact: true }).selectOption("fontkite");
    assert.deepEqual(await pdf(page), original);
    assert.deepEqual(await argumentsFor(page), args);
    assert.match(await page.locator("#status").innerText(), /fail|Failed/u);
    await page.locator("#title").fill("Still Fontkit");
    assert.deepEqual(await pdf(page), await expectedPdf("fontkit", "Still Fontkit"));
    assert.equal((await argumentsFor(page)).engine, "fontkit");
    assert.match(await page.locator("#status").innerText(), /Fontkit; reused prepared font/u);
    assert.equal(requests, 1);
  } finally {
    await app.close();
  }
});

test("Fontkite parse failure never falls back to Fontkit, and failed sources are only retried on submission", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage(),
      requests: string[] = [],
      kitFiles = await fontkitChunks();
    page.on("request", (request) => requests.push(request.url()));
    await coldFontkite(page, app.url);
    const previous = await pdf(page),
      previousArgs = await argumentsFor(page);
    const uri = "https://font.invalid/invalid.ttf";
    let loads = 0;
    await page.route(uri, (route) => {
      loads++;
      return route.fulfill({ headers: { "access-control-allow-origin": "*" }, body: "not a font" });
    });
    await page.getByLabel("Font file URI", { exact: true }).fill(uri);
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    assert.deepEqual(await pdf(page), previous);
    assert.deepEqual(await argumentsFor(page), previousArgs);
    assert.match(await page.locator("#status").innerText(), /FONT_FORMAT/u);
    await page.getByLabel("Sample font size (points)", { exact: true }).fill("22");
    assert.deepEqual(await pdf(page), await expectedPdf("fontkite", undefined, 22));
    assert.equal(loads, 1);
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    await pdf(page);
    assert.equal(loads, 2);
    assert.ok(!requests.some((url) => kitFiles.some((file) => url.endsWith(file))));
  } finally {
    await app.close();
  }
});

test("a late engine module cannot begin a font request after leaving the example", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage(),
      fonts: string[] = [];
    page.on("request", (request) => {
      if (/\.ttf(?:\?|$)/u.test(request.url())) fonts.push(request.url());
    });
    let release: (() => Promise<void>) | undefined;
    await page.route("**/font-engine-fontkit-*.js", (route) => {
      release = () => route.continue();
    });
    await page.goto(app.url);
    const original = await pdf(page);
    const request = page.waitForRequest("**/font-engine-fontkit-*.js");
    await page.getByLabel("Example", { exact: true }).selectOption("font-uri");
    await request;
    await page.getByLabel("Example", { exact: true }).selectOption("text");
    await pdf(page);
    assert.ok(release);
    await release();
    await settledModule(page, request);
    assert.deepEqual(await pdf(page), original);
    assert.deepEqual(fonts, []);
  } finally {
    await app.close();
  }
});

test("switching engine aborts a pending replacement URI and prepares the active bytes instead", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.goto(app.url);
    await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("font-uri");
    await pdf(page);
    const uri = "https://font.invalid/held.ttf";
    let loads = 0,
      release: (() => Promise<void>) | undefined;
    await page.route(uri, (route) => {
      loads++;
      release = () => route.fulfill({ body: "late invalid bytes" }).catch(() => {});
    });
    await page.getByLabel("Font file URI", { exact: true }).fill(uri);
    const request = page.waitForRequest(uri);
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    await request;
    const aborted = page.waitForEvent("requestfailed", (event) => event.url() === uri);
    await page.getByLabel("Font engine", { exact: true }).selectOption("fontkite");
    await aborted;
    const expected = await expectedPdf("fontkite");
    assert.deepEqual(await pdf(page), expected);
    assert.ok(release);
    await release();
    assert.deepEqual(await pdf(page), expected);
    assert.deepEqual(await argumentsFor(page), { engine: "fontkite", uri: "", fontSize: 18 });
    assert.equal(loads, 1);
  } finally {
    await app.close();
  }
});
