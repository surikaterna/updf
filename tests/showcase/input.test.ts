import assert from "node:assert/strict";
import test from "node:test";
import { textDemo } from "../../apps/showcase/src/text.js";
import { pageErrors, pdf, site, source } from "./helpers.js";

test("bounded form input is data, never HTML or evaluated source", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    const errors = pageErrors(page);
    await page.goto(app.url);
    const title = "<img src=x>";
    await page.getByLabel("PDF title", { exact: true }).fill(title);
    await page.getByRole("button", { name: "Generate PDF" }).click();
    assert.deepEqual(await pdf(page, "input-proof.pdf"), textDemo(title));
    assert.equal(await page.locator("img").count(), 0);
    await source(page, "text.ts");
    await page.locator("#title").evaluate((element) => {
      if (!(element instanceof HTMLInputElement)) throw new Error("Expected input");
      element.value = "A".repeat(41);
    });
    await page.getByRole("button", { name: "Generate PDF" }).click();
    await page.getByRole("status").filter({ hasText: "at most 40 characters" }).waitFor();
    assert.equal(await page.locator("#output").isVisible(), false);
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

test("open/download fallback works when embedded PDF is blocked by browser policy", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.route(app.url, async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        headers: { ...response.headers(), "content-security-policy": "frame-src 'none'" },
      });
    });
    await page.goto(app.url);
    await page.getByRole("button", { name: "Generate PDF" }).click();
    assert.deepEqual(await pdf(page, "fallback-proof.pdf"), textDemo("Hello portable PDF"));
    assert.equal(await page.getByText(/Embedded preview may be unavailable/).isVisible(), true);
    assert.equal(await page.getByRole("link", { name: "Open PDF in a new tab" }).isVisible(), true);
  } finally {
    await app.close();
  }
});
