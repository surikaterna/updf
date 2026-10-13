import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { prepareFont } from "@updf/fontkit";
import { fontUriExample } from "../../apps/showcase/src/font-uri.js";
import { pdf, site } from "./helpers.js";

async function fixture(bold = false) {
  const bytes = await readFile(
    new URL(`../fixtures/fonts/LiberationSans-${bold ? "Bold" : "Regular"}.ttf`, import.meta.url),
  );
  return { bytes, prepared: prepareFont(new Uint8Array(bytes)) };
}

test("unsubmitted invalid, empty and valid URI drafts do not block active-font edits or fetch", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    let requests = 0;
    await page.route("https://draft.invalid/**", (route) => {
      requests++;
      return route.abort();
    });
    await page.goto(app.url);
    await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("font-uri");
    await pdf(page);
    const font = (await fixture()).prepared;
    for (const [uri, size] of [
      ["incomplete-url", 24],
      ["", 25],
      ["https://draft.invalid/font.ttf", 26],
    ] as const) {
      await page.getByLabel("Font file URI", { exact: true }).fill(uri);
      await page.getByLabel("Sample font size (points)", { exact: true }).fill(String(size));
      assert.deepEqual(await pdf(page), fontUriExample(font, "Hello portable PDF", size).bytes);
      assert.notEqual(await page.locator("#font-uri").getAttribute("aria-invalid"), "true");
      assert.deepEqual(JSON.parse((await page.locator("#source-arguments").textContent())!).controls, {
        engine: "fontkit",
        uri: "",
        fontSize: size,
      });
    }
    assert.equal(requests, 0);
    await page.getByLabel("Font file URI", { exact: true }).fill("incomplete-url");
    const previous = await pdf(page);
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    assert.deepEqual(await pdf(page), previous);
    assert.equal(await page.locator("#font-uri").getAttribute("aria-invalid"), "true");
  } finally {
    await app.close();
  }
});

test("failed replacements preserve the active remote font; only explicit submission retries", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    const remote = await fixture(true);
    const uri = "https://font.invalid/active.ttf";
    let requests = 0;
    await page.route("https://font.invalid/**", (route) => {
      requests++;
      return route.fulfill({
        status: route.request().url() === uri ? 200 : 404,
        headers: { "access-control-allow-origin": "*" },
        body: route.request().url() === uri ? remote.bytes : "missing",
      });
    });
    await page.goto(app.url);
    await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("font-uri");
    await pdf(page);
    await page.getByLabel("Font file URI", { exact: true }).fill(uri);
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    const original = await pdf(page);
    await page.getByLabel("Font file URI", { exact: true }).fill("https://font.invalid/missing.ttf");
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    assert.deepEqual(await pdf(page), original);
    await page.getByLabel("Sample font size (points)", { exact: true }).fill("24");
    assert.deepEqual(await pdf(page), fontUriExample(remote.prepared, "Hello portable PDF", 24).bytes);
    await page.locator("#title").fill("Still active");
    assert.deepEqual(await pdf(page), fontUriExample(remote.prepared, "Still active", 24).bytes);
    assert.equal(requests, 2);
    assert.equal(JSON.parse((await page.locator("#source-arguments").textContent())!).controls.uri, uri);
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    await pdf(page);
    assert.equal(requests, 3);
  } finally {
    await app.close();
  }
});

test("editing while a replacement is pending aborts it and keeps the active font", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    let requests = 0;
    await page.route("https://font.invalid/held.ttf", () => {
      requests++;
    });
    await page.goto(app.url);
    await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("font-uri");
    await pdf(page);
    await page.getByLabel("Font file URI", { exact: true }).fill("https://font.invalid/held.ttf");
    const request = page.waitForRequest("https://font.invalid/held.ttf");
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    await request;
    const aborted = page.waitForEvent("requestfailed", (event) => event.url().endsWith("/held.ttf"));
    await page.locator("#title").fill("Active during load");
    await aborted;
    assert.deepEqual(await pdf(page), fontUriExample((await fixture()).prepared, "Active during load").bytes);
    await page.setViewportSize({ width: 320, height: 812 });
    await page.waitForFunction(() => document.querySelector("#demo-form")?.getAttribute("aria-busy") === "true");
    await pdf(page);
    assert.equal(requests, 1);
    assert.equal(JSON.parse((await page.locator("#source-arguments").textContent())!).controls.uri, "");
  } finally {
    await app.close();
  }
});
