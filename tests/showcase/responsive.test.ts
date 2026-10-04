import assert from "node:assert/strict";
import test from "node:test";
import { site, source } from "./helpers.js";

test("rich diagnostics, controls and scrollable source remain reachable on narrow viewports", async () => {
  const app = await site();
  try {
    const cases = [320, 370, 375].flatMap((width) => [false, true].map((fallback) => ({ width, fallback })));
    for (const { width, fallback } of cases) {
      const page = await app.browser.newPage({ viewport: { width, height: 812 } });
      await page.goto(app.url);
      if (fallback)
        await page.addStyleTag({
          content: `
          :root { font-family: monospace; font-size: 16px; }
          html { overflow-y: scroll; scrollbar-gutter: stable; }
          ::-webkit-scrollbar { width: 24px; height: 24px; }
        `,
        });
      await page.getByLabel("Example", { exact: true }).selectOption("rich");
      await source(page, "rich.tsx");
      await page.getByLabel("Width", { exact: true }).fill("20");
      await page.getByRole("button", { name: "Generate PDF" }).click();
      await page
        .getByRole("status")
        .filter({ hasText: /TOKEN_OVERFLOW/ })
        .waitFor();
      await page.getByLabel("Width", { exact: true }).focus();
      await page.keyboard.press("Tab");
      assert.equal(await page.locator("#rich-font-size").evaluate((e) => e === document.activeElement), true);
      await assertReachable(page);
      await page.close();
    }
  } finally {
    await app.close();
  }
});

async function assertReachable(page: import("playwright").Page): Promise<void> {
  const geometry = await page.evaluate(() => {
    const sourcePanel = document.querySelector("pre");
    if (!(sourcePanel instanceof HTMLElement)) throw new Error("Missing source panel");
    sourcePanel.scrollLeft = sourcePanel.scrollWidth;
    return {
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      controls: Array.from(
        document.querySelectorAll("#demo-form input, #demo-form select, #demo-form button, #status, pre"),
      )
        .filter((e) => e.getClientRects().length > 0)
        .map((e) => ({
          id: e.id,
          left: e.getBoundingClientRect().left,
          right: e.getBoundingClientRect().right,
          client: e.clientWidth,
          scroll: e.scrollWidth,
        })),
      sourceScrolled: sourcePanel.scrollLeft > 0,
      sourceOverflow: getComputedStyle(sourcePanel).overflowX,
    };
  });
  assert.ok(geometry.document <= geometry.viewport, JSON.stringify(geometry));
  for (const control of geometry.controls) {
    assert.ok(control.left >= 0 && control.right <= geometry.viewport, JSON.stringify(control));
    if (control.id === "status") assert.ok(control.scroll <= control.client);
  }
  assert.equal(geometry.sourceOverflow, "auto");
  assert.equal(geometry.sourceScrolled, true);
}
