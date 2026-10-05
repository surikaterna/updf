import assert from "node:assert/strict";
import test from "node:test";
import { textDemo } from "../../apps/showcase/src/text.js";
import { pdf, rendered, screenshot, site, source } from "./helpers.js";

test("desktop workspace pairs inputs with preview and discloses real source below", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 1280, height: 960 } });
    await page.goto(app.url);
    await rendered(page);
    assert.equal(await page.locator("#example-code").getAttribute("open"), null);
    const inputs = await page.locator("#demo-form").boundingBox();
    const preview = await page.locator(".preview-panel").boundingBox();
    const code = await page.locator("#example-code").boundingBox();
    assert.ok(inputs && preview && code);
    assert.equal(inputs.y, preview.y);
    assert.ok(inputs.x + inputs.width < preview.x);
    assert.ok(code.y >= preview.y + preview.height);
    assert.equal(await page.locator("#example optgroup").count(), 4);
    assert.equal(await page.locator("#example option").count(), 16);
    await screenshot(page, "s6-desktop");
    await page.locator("#example-code summary").focus();
    await page.keyboard.press("Space");
    await source(page, "text.ts");
    assert.match(await page.locator("#source-files").innerText(), /text.ts/);
    await screenshot(page, "s6-desktop-source");
  } finally {
    await app.close();
  }
});

test("live edits commit matching bytes, pixels and arguments without focus or per-input announcements", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.goto(app.url);
    const original = await rendered(page);
    const settled = await page.locator("#status").innerText();
    const args = await page.locator("#source-arguments").textContent();
    await page.locator("#title").fill("IIII");
    assert.equal(await page.locator("#status").innerText(), settled);
    assert.equal(await page.locator("#source-arguments").textContent(), args);
    assert.match((await page.locator("#source-state").textContent()) ?? "", /update is pending/);
    assert.deepEqual(await pdf(page), textDemo("IIII"));
    assert.notDeepEqual(await rendered(page), original);
    assert.match((await page.locator("#source-arguments").textContent()) ?? "", /IIII/);
    await page.locator("#title").fill("Latest stable focus");
    await rendered(page);
    assert.equal(await page.locator("#title").evaluate((e) => e === document.activeElement), true);
  } finally {
    await app.close();
  }
});

test("resize pending state does not claim unchanged inputs differ from the result", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 1280, height: 960 } });
    await page.goto(app.url);
    await rendered(page);
    const args = await page.locator("#source-arguments").textContent();
    await page.setViewportSize({ width: 1100, height: 960 });
    await page.locator('#demo-form[aria-busy="true"]').waitFor();
    assert.match(await page.locator("#result-state").innerText(), /Previous PDF remains shown and linked/);
    assert.doesNotMatch(await page.locator("#result-state").innerText(), /[Ii]nputs.*match/);
    assert.match((await page.locator("#source-state").textContent()) ?? "", /update is pending/);
    assert.equal(await page.locator("#source-arguments").textContent(), args);
    await rendered(page);
    assert.equal(await page.locator("#source-arguments").textContent(), args);
  } finally {
    await app.close();
  }
});

test("reset keeps the current demo; invalid bounds are associated and preserve the result", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.goto(app.url);
    await page.locator("#example").selectOption("rich");
    await rendered(page);
    await page.locator("#flow-count").evaluate((field) => {
      if (field instanceof HTMLInputElement) field.value = "9";
    });
    const href = await page.locator("#download").getAttribute("href");
    await page.locator("#rich-width").fill("501");
    await page.locator('#demo-form[aria-busy="false"]').waitFor();
    assert.equal(await page.locator("#rich-width").getAttribute("aria-invalid"), "true");
    assert.match((await page.locator("#rich-width").getAttribute("aria-describedby")) ?? "", /input-error/);
    assert.equal(await page.locator("#download").getAttribute("href"), href);
    assert.match(await page.locator("#result-state").innerText(), /Previous result/);
    await page.getByRole("button", { name: "Reset demo", exact: true }).click();
    await rendered(page);
    assert.equal(await page.locator("#example").inputValue(), "rich");
    assert.equal(await page.locator("#rich-width").inputValue(), "280");
    assert.equal(await page.locator("#flow-count").inputValue(), "9");
    assert.equal(await page.locator("#rich-width").getAttribute("aria-invalid"), null);
    assert.equal(await page.locator("#rich-width").getAttribute("aria-describedby"), null);
    assert.equal(await page.locator("#input-error").isHidden(), true);
  } finally {
    await app.close();
  }
});

test("only the invalid field describes the error, preserving help through recovery and demo changes", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.goto(app.url);
    await page.locator("#example").selectOption("rich");
    await rendered(page);
    await page.locator("#rich-font-size").evaluate((field) => field.setAttribute("aria-describedby", "title-help"));
    await page.locator("#rich-font-size").fill("33");
    await page.locator('#demo-form[aria-busy="false"]').waitFor();
    const message = await page.locator("#input-error").innerText();
    assert.match(message, /^Font size: .+32/);
    assert.equal(await page.locator("#rich-font-size").getAttribute("aria-invalid"), "true");
    assert.equal(await page.locator("#rich-font-size").getAttribute("aria-describedby"), "title-help input-error");
    assert.match(await description(page, "rich-font-size"), /Up to 40 characters.*Font size:/s);
    await assertUnrelatedDescriptions(page, "rich-font-size", message);
    await page.locator("#rich-font-size").fill("16");
    await rendered(page);
    assert.equal(await page.locator("#rich-font-size").getAttribute("aria-invalid"), null);
    assert.equal(await page.locator("#rich-font-size").getAttribute("aria-describedby"), "title-help");
    assert.equal(await page.locator("#input-error").isHidden(), true);
    assert.match((await page.locator("#source-arguments").textContent()) ?? "", /"fontSize": 16/);
    await page.locator("#rich-font-size").fill("33");
    await page.locator('#demo-form[aria-busy="false"]').waitFor();
    await page.locator("#example").selectOption("text");
    await rendered(page);
    assert.equal(await page.locator("#rich-font-size").getAttribute("aria-invalid"), null);
    assert.equal(await page.locator("#rich-font-size").getAttribute("aria-describedby"), "title-help");
    assert.equal(await page.locator("#input-error").isHidden(), true);
  } finally {
    await app.close();
  }
});

test("unsupported title describes its error and restores title help on successful recovery", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.goto(app.url);
    await rendered(page);
    await page.locator("#title").fill("Unsupported ☃");
    await page.locator('#demo-form[aria-busy="false"]').waitFor();
    const message = await page.locator("#input-error").innerText();
    assert.match(message, /CHARACTER/);
    assert.equal(await page.locator("#title").getAttribute("aria-invalid"), "true");
    assert.equal(await page.locator("#title").getAttribute("aria-describedby"), "title-help input-error");
    assert.ok((await description(page, "title")).includes(message));
    await assertUnrelatedDescriptions(page, "title", message);
    await page.locator("#title").fill("Recovered title");
    await rendered(page);
    assert.equal(await page.locator("#title").getAttribute("aria-invalid"), null);
    assert.equal(await page.locator("#title").getAttribute("aria-describedby"), "title-help");
    assert.equal(await page.locator("#input-error").isHidden(), true);
    assert.match((await page.locator("#source-arguments").textContent()) ?? "", /Recovered title/);
  } finally {
    await app.close();
  }
});

async function description(page: import("playwright").Page, id: string): Promise<string> {
  return page.locator(`#${id}`).evaluate((field) =>
    (field.getAttribute("aria-describedby") ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" "),
  );
}

async function assertUnrelatedDescriptions(page: import("playwright").Page, invalid: string, message: string) {
  for (const id of ["title", "example", "rich-font-size", "rich-width", "rich-align"]) {
    if (id === invalid) continue;
    assert.equal(await page.locator(`#${id}`).getAttribute("aria-invalid"), null);
    assert.doesNotMatch((await page.locator(`#${id}`).getAttribute("aria-describedby")) ?? "", /input-error/);
    assert.equal((await description(page, id)).includes(message), false);
  }
  assert.match(await description(page, "title"), /Up to 40 characters/);
}

test("320px and enlarged text reflow in navigation-input-preview-source order", async () => {
  const app = await site();
  try {
    for (const enlarged of [false, true]) {
      const page = await app.browser.newPage({ viewport: { width: 320, height: 812 } });
      await page.goto(app.url);
      if (enlarged) await page.addStyleTag({ content: ":root { font-size: 32px; }" });
      await rendered(page);
      await page.locator("#example-code summary").focus();
      await page.keyboard.press("Enter");
      await assertStack(page);
      await screenshot(page, enlarged ? "s6-mobile-text200" : "s6-mobile320");
      await page.locator(".plasma-link").focus();
      assert.equal(await page.locator(".plasma-link").evaluate((e) => e === document.activeElement), true);
      await page.close();
    }
  } finally {
    await app.close();
  }
});

async function assertStack(page: import("playwright").Page): Promise<void> {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const panels = await Promise.all(
    [".demo-navigation", "#demo-form", ".preview-panel", "#example-code"].map((selector) =>
      page.locator(selector).boundingBox(),
    ),
  );
  for (let index = 1; index < panels.length; index += 1) {
    const before = panels[index - 1];
    const after = panels[index];
    assert.ok(before && after);
    assert.ok(after.y >= before.y + before.height);
  }
}
