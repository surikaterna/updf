import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { Page } from "playwright";
import { compute } from "../../src/compute.js";
import { exportProjection } from "../../src/pdf.js";
import { project } from "../../src/projection.js";
import { controls } from "../fixtures.js";
import { artifactDirectory, assertPDFGeometry, inspectPDF } from "../pdf-tools.js";
import { complete, graph, withBrowser } from "./harness.js";

async function clickSource(page: Page, id: string, edge = false): Promise<void> {
  const shape = page.locator(`[data-source="${id}"]`).first();
  assert.equal(await shape.getAttribute("fill"), "none");
  await shape.scrollIntoViewIfNeeded();
  await shape.evaluate((element) => element.scrollIntoView({ block: "center", inline: "start" }));
  const box = await shape.boundingBox();
  assert.ok(box);
  const point = { x: box.x + (edge ? 0.75 : box.width / 2), y: box.y + box.height / 2 };
  assert.equal(
    await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.getAttribute("data-source"), point),
    id,
  );
  await page.mouse.click(point.x, point.y);
  assert.equal(JSON.parse(await page.locator("#metadata").innerText()).selected, id);
  assert.equal(await page.locator(`[data-source="${id}"]`).first().getAttribute("fill"), "#ffdda480");
}

async function clickPageMargin(page: Page): Promise<void> {
  const svg = page.locator("#canvas svg").first();
  await svg.scrollIntoViewIfNeeded();
  const box = await svg.boundingBox();
  assert.ok(box);
  const before = JSON.parse(await page.locator("#metadata").innerText()).selected;
  await page.mouse.click(box.x + 5, box.y + 5);
  assert.equal(JSON.parse(await page.locator("#metadata").innerText()).selected, before);
}

test("unselected SVG allocation centers select source IDs without parent or margin interception", async () => {
  await withBrowser(async (page, origin) => {
    await page.goto(origin);
    await complete(page);
    await clickSource(page, "A");
    await clickSource(page, "B", true);
    await clickPageMargin(page);
    const root = page.locator("#selection button").filter({ hasText: /^root \(/u });
    await root.focus();
    await page.keyboard.press("Enter");
    assert.equal(await root.getAttribute("aria-pressed"), "true");
    await page.getByLabel("Preset", { exact: true }).selectOption("pdf");
    await page.getByLabel("Finite pages", { exact: false }).check();
    await complete(page);
    await clickSource(page, "line-0");
    await clickSource(page, "row-A");
    await clickPageMargin(page);
    await page.getByLabel("Paragraph source", { exact: false }).fill("\nReserved blank line");
    await page.waitForFunction(() => document.querySelector("#canvas text")?.textContent === "");
    await complete(page);
    await clickSource(page, "line-0");
    await clickSource(page, "line-1", true);
  });
});

test("actual request graph: boxes omit core/C; optional box pagination loads C", async () => {
  const chunks = graph();
  const entry = chunks.find((chunk) => chunk.isEntry);
  assert.ok(entry);
  const initial = [entry, ...entry.imports.map((name) => chunks.find((chunk) => chunk.fileName === name))];
  assert.ok(
    initial.every(
      (chunk) => chunk && !chunk.modules.some((name) => /packages\/core\/|fragment(?:ation|-)/u.test(name)),
    ),
  );
  const c = chunks.find((chunk) => chunk.modules.some((name) => name.endsWith("/dist/fragmentation.js")));
  const pdf = chunks.find((chunk) => chunk.modules.some((name) => name.endsWith("/layout-playground/src/pdf.ts")));
  assert.ok(c && pdf && c.bytes > 0 && pdf.bytes > 0);
  await withBrowser(async (page, origin) => {
    const requested: string[] = [];
    page.on("request", (request) => requested.push(new URL(request.url()).pathname));
    await page.goto(origin);
    await complete(page);
    assert.ok(!requested.includes(`/${c.fileName}`) && !requested.includes(`/${pdf.fileName}`));
    await page.getByLabel("Finite pages", { exact: false }).check();
    await complete(page);
    assert.ok(requested.includes(`/${c.fileName}`));
    assert.ok(!requested.includes(`/${pdf.fileName}`));
    assert.equal(await page.locator("#download").isDisabled(), true);
  });
});

test("PDF canvas is C-free; selected pagination browser bytes equal Node, controls and keyboard at 320px", async () => {
  const c = graph().find((chunk) => chunk.modules.some((name) => name.endsWith("/dist/fragmentation.js")));
  assert.ok(c);
  await withBrowser(async (page, origin) => {
    const requested: string[] = [];
    page.on("request", (request) => requested.push(new URL(request.url()).pathname));
    await page.goto(origin);
    await complete(page);
    await page.getByLabel("Preset", { exact: true }).selectOption("pdf");
    await complete(page);
    assert.ok(!requested.includes(`/${c.fileName}`));
    await page.getByLabel("Finite pages", { exact: false }).check();
    await complete(page);
    assert.ok(requested.includes(`/${c.fileName}`));
    const first = page.locator("#selection button").first();
    await first.focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#selection button").first().getAttribute("aria-pressed"), "true");
    assert.ok((await page.locator('[data-source="line-0"]').getAttribute("fill")) === "#ffdda480");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(overflow, false);
    const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#download").click()]);
    const path = await download.path();
    assert.ok(path);
    const bytes = readFileSync(path);
    const projection = project(await compute(controls));
    assert.deepEqual(bytes, Buffer.from(exportProjection(projection)));
    assertPDFGeometry(projection, inspectPDF(bytes, "browser-selected"));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${artifactDirectory()}mobile-controls.png` });
    await page.locator("#canvas").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${artifactDirectory()}mobile-pagination.png` });
    await page.getByLabel("Width", { exact: true }).fill("260.5");
    await page.locator("#status").filter({ hasText: "error" }).waitFor();
    assert.equal(await page.locator("#download").isDisabled(), true);
    assert.equal(await page.locator("#canvas svg").count(), 2);
    await page.screenshot({ path: `${artifactDirectory()}invalid-width.png` });
    await page.getByLabel("Width", { exact: true }).fill("260");
    await complete(page);
    await page.getByLabel("Page cap", { exact: false }).fill("1");
    await page.locator("#status").filter({ hasText: "INCOMPLETE (cap)" }).waitFor();
    assert.equal(await page.locator("#download").isDisabled(), true);
    await page.getByLabel("Paragraph source", { exact: false }).fill("bad\ttext");
    await page.locator("#status").filter({ hasText: "CHARACTER" }).waitFor();
  });
});

test("live supported box controls recompute authoritative geometry", async () => {
  await withBrowser(async (page, origin) => {
    await page.goto(origin);
    await complete(page);
    await page.getByLabel("Row cross alignment", { exact: true }).selectOption("center");
    await complete(page);
    await page.getByLabel("Padding", { exact: true }).fill("12");
    await complete(page);
    await page.getByLabel("Gap", { exact: true }).fill("10");
    await complete(page);
    const metadata = JSON.parse(await page.locator("#metadata").innerText());
    const root = metadata.pages[0].rectangles.find((rect: { id: string }) => rect.id === "root");
    const a = metadata.pages[0].rectangles.find((rect: { id: string }) => rect.id === "A");
    assert.equal(root.height, 78);
    assert.equal(a.x, 32);
    assert.equal(a.y, 41);
    await page.getByLabel("Gap", { exact: true }).fill("");
    await page.locator("#status").filter({ hasText: "VALUE /gap" }).waitFor();
    assert.equal(await page.locator("#download").isDisabled(), true);
  });
});

test("late PDF import cannot supersede newer boxes selection", async () => {
  const pdf = graph().find((chunk) => chunk.modules.some((name) => name.endsWith("/layout-playground/src/pdf.ts")));
  assert.ok(pdf);
  await withBrowser(async (page, origin) => {
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let arrived = () => {};
    const waiting = new Promise<void>((resolve) => {
      arrived = resolve;
    });
    await page.route(`**/${pdf.fileName}`, async (route) => {
      arrived();
      await held;
      await route.continue();
    });
    await page.goto(origin);
    await complete(page);
    try {
      await page.getByLabel("Preset", { exact: true }).selectOption("pdf");
      await waiting;
      await page.getByLabel("Preset", { exact: true }).selectOption("boxes");
      await complete(page);
    } finally {
      release();
    }
    await page.waitForResponse((response) => response.url().endsWith(pdf.fileName));
    await page.waitForTimeout(200);
    assert.match(await page.locator("#status").innerText(), /Boxes only/u);
    assert.equal(await page.locator("#download").isDisabled(), true);
    assert.equal(await page.locator("#canvas text").count(), 0);
    await page.getByLabel("Direction", { exact: true }).selectOption("column");
    await complete(page);
    assert.equal(await page.getByLabel("Row cross alignment", { exact: true }).isDisabled(), true);
  });
});
