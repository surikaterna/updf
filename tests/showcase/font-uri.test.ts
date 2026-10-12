import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { prepareFont } from "@updf/fontkit";
import { fontUriExample } from "../../apps/showcase/src/font-uri.js";
import { googleFontUri } from "../../apps/showcase/src/font-uri-controls.js";
import { observeUrls, pageErrors, pdf, rendered, retained, screenshot, settledModule, site } from "./helpers.js";

async function font(bold = false) {
  const bytes = new Uint8Array(
    await readFile(new URL(`../fixtures/fonts/LiberationSans-${bold ? "Bold" : "Regular"}.ttf`, import.meta.url)),
  );
  return { bytes, prepared: prepareFont(bytes) };
}

test("font URI is opt-in, typing never fetches, and explicit loads/size changes match Node bytes", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 1100, height: 900 } });
    const requests: string[] = [],
      errors = pageErrors(page);
    page.on("request", (request) => requests.push(request.url()));
    const remote = await font(true);
    await page.route("https://fonts.gstatic.com/**", (route) =>
      route.fulfill({
        contentType: "font/ttf",
        headers: { "access-control-allow-origin": "*" },
        body: Buffer.from(remote.bytes),
      }),
    );
    await observeUrls(page);
    await page.goto(app.url);
    await pdf(page);
    assert.ok(!requests.some((url) => /optional-font-uri-|fonts.gstatic.com/u.test(url)));
    await page.getByLabel("Example", { exact: true }).selectOption("font-uri");
    assert.deepEqual(await pdf(page), fontUriExample((await font()).prepared, "Hello portable PDF").bytes);
    assert.match(await page.locator("#status").innerText(), /bundled sample/u);
    assert.equal(await page.getByLabel("Font file URI", { exact: true }).inputValue(), googleFontUri);
    await page.getByLabel("Font file URI", { exact: true }).fill(googleFontUri);
    await page.waitForTimeout(400);
    assert.ok(!requests.some((url) => url.startsWith("https://fonts.gstatic.com/")));
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    assert.deepEqual(await pdf(page), fontUriExample(remote.prepared, "Hello portable PDF").bytes);
    assert.match(await page.locator("#status").innerText(), /LiberationSans-Bold.*submitted URI/u);
    await page.getByLabel("Sample font size (points)", { exact: true }).fill("24");
    assert.deepEqual(await pdf(page), fontUriExample(remote.prepared, "Hello portable PDF", 24).bytes);
    assert.equal(requests.filter((url) => url.startsWith("https://fonts.gstatic.com/")).length, 1);
    const source = await page.locator("#source").textContent();
    for (const name of ["font-uri.tsx", "font-uri-controls.ts", "optional-font-uri.ts"])
      assert.ok(source?.includes(await readFile(new URL(`../../apps/showcase/src/${name}`, import.meta.url), "utf8")));
    await rendered(page);
    await retained(page);
    await screenshot(page, "font-uri-desktop");
    await page.setViewportSize({ width: 320, height: 812 });
    await page.waitForFunction(() => document.querySelector("#demo-form")?.getAttribute("aria-busy") === "true");
    await pdf(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await screenshot(page, "font-uri-mobile");
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

test("CSS/HTTP/input failures retain the previous PDF and source; reset returns to the bundled font", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await observeUrls(page);
    await page.goto(app.url);
    await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("font-uri");
    const original = await pdf(page),
      args = await page.locator("#source-arguments").textContent();
    await page.route("https://fonts.googleapis.com/**", (route) =>
      route.fulfill({
        contentType: "text/css",
        headers: { "access-control-allow-origin": "*" },
        body: "@font-face {src:url(font.woff2)}",
      }),
    );
    await page.getByLabel("Font file URI", { exact: true }).fill("https://fonts.googleapis.com/css2?family=Roboto");
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    assert.deepEqual(await pdf(page), original);
    assert.match(await page.locator("#status").innerText(), /CSS stylesheet/u);
    assert.equal(await page.locator("#source-arguments").textContent(), args);
    await page.route("https://example.com/missing.ttf", (route) =>
      route.fulfill({ status: 404, headers: { "access-control-allow-origin": "*" }, body: "not found" }),
    );
    await page.getByLabel("Font file URI", { exact: true }).fill("https://example.com/missing.ttf");
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    assert.deepEqual(await pdf(page), original);
    assert.match(await page.locator("#status").innerText(), /FONT_LOAD/u);
    await page.getByRole("button", { name: "Reset demo", exact: true }).click();
    assert.deepEqual(await pdf(page), original);
    await retained(page);
  } finally {
    await app.close();
  }
});

test("switching examples aborts a held font request without stale output or poisoned cached font", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.goto(app.url);
    await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("font-uri");
    await pdf(page);
    let release: (() => Promise<void>) | undefined;
    await page.route("https://example.com/slow.ttf", (route) => {
      release = () =>
        route.fulfill({ headers: { "access-control-allow-origin": "*" }, body: "late invalid bytes" }).catch(() => {});
    });
    const request = page.waitForRequest("https://example.com/slow.ttf");
    await page.getByLabel("Font file URI", { exact: true }).fill("https://example.com/slow.ttf");
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    await request;
    await page.getByLabel("Example", { exact: true }).selectOption("text");
    const current = await pdf(page);
    assert.ok(release);
    await release();
    assert.deepEqual(await pdf(page), current);
    assert.equal(await page.locator("#font-uri-controls").isVisible(), false);
  } finally {
    await app.close();
  }
});

test("a late optional font module cannot start loading after the user selects another example", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    const fonts: string[] = [];
    page.on("request", (request) => {
      if (/\.ttf(?:\?|$)/u.test(request.url())) fonts.push(request.url());
    });
    let release: (() => Promise<void>) | undefined;
    await page.route("**/optional-font-uri-*.js", (route) => {
      release = () => route.continue();
    });
    await page.goto(app.url);
    const original = await pdf(page);
    const request = page.waitForRequest("**/optional-font-uri-*.js");
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
