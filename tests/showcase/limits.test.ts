import assert from "node:assert/strict";
import test from "node:test";
import { site } from "./helpers.js";

test("showcase keeps practical limits and unreleased notice without a stale roadmap", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.goto(app.url);
    assert.equal(await page.locator("#roadmap").count(), 0);
    assert.equal(await page.locator('a[href="#roadmap"]').count(), 0);
    const footer = await page.locator("footer").innerText();
    assert.doesNotMatch(footer, /OPEN|unmerged|awaiting independent audit|deployment.*authorization/);
    assert.equal(await page.locator('a[href*="feature/declarative-cmr-poc"]').count(), 0);
    const limits = await page.locator("#limits").innerText();
    assert.match(limits, /Experimental, unreleased native implementation/);
    assert.match(limits, /@updf\/jpeg.*showcase demonstrates baseline color\/grayscale/s);
    assert.doesNotMatch(limits, /@updf\/core\/fonts/);
    assert.match(limits, /prepared resources through @updf\/fonts/);
    assert.match(limits, /explicitly choose @updf\/fontkit or experimental @updf\/fontkite/);
    assert.match(limits, /initial entry stays parser-free; freight still uses Fontkit/);
  } finally {
    await app.close();
  }
});
