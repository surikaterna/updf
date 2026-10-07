import assert from "node:assert/strict";
import test from "node:test";
import { site } from "./helpers.js";

test("published roadmap separates dated open acceptance from merged, unreleased scope", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.goto(app.url);
    assert.equal(await page.locator("#roadmap time").getAttribute("datetime"), "2026-10-07");
    const roadmap = await page.locator("#roadmap").innerText();
    assert.match(roadmap, /21dcd48.*private and unreleased/s);
    assert.match(roadmap, /not priority or a delivery commitment/);
    const merged = await page.locator("#roadmap-merged").innerText();
    assert.match(merged, /#25.*does not deliver #55 cumulative trial-work/s);
    assert.match(merged, /#26.*#27.*#28.*merged foundations/s);
    assert.match(merged, /#33.*bounded JPEG v1 only.*PNG\/alpha.*not complete/s);
    assert.match(merged, /#34.*#35 documentation acceptance remains open/s);
    assert.match(roadmap, /#48.*closed \/ not planned.*root cause remains unknown.*no production fix/s);
    assert.match(roadmap, /#50.*fixed separately.*does not resolve #48/s);
    const footer = await page.locator("footer").innerText();
    assert.doesNotMatch(footer, /OPEN|unmerged|awaiting independent audit|deployment.*authorization/);
    assert.equal(await page.locator('a[href*="feature/declarative-cmr-poc"]').count(), 0);
    assert.equal(await page.locator('#roadmap a[href*="docs/roadmap"]').count(), 0);
    const limits = await page.locator("#limits").innerText();
    assert.match(limits, /@updf\/jpeg.*no image demo/s);
    assert.doesNotMatch(limits, /@updf\/core\/fonts/);
    assert.match(limits, /prepared resources through @updf\/fonts; the optional @updf\/fontkit adapter/);
  } finally {
    await app.close();
  }
});
