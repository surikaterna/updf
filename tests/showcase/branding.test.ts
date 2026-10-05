import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { compileSVG } from "@updf/svg";
import type { Page } from "playwright";
import { type brandingDefaults, validateBranding } from "../../apps/showcase/src/branding-controls.js";
import { brandingLogo, brandPalettes } from "../../apps/showcase/src/branding-logo.js";
import { brandingDemo } from "../../apps/showcase/src/branding.js";
import { pageErrors, pdf, rendered, screenshot, site } from "./helpers.js";

test("trusted original logo compiles without diagnostics; bounded controls change native vector PDF", () => {
  const original = brandingDemo("Studio proposal");
  for (const palette of Object.keys(brandPalettes) as (keyof typeof brandPalettes)[]) {
    for (const logoSize of [32, 56, 80]) {
      const compiled = compileSVG(brandingLogo(palette), { x: 48, y: 42, w: logoSize, h: logoSize });
      assert.deepEqual(compiled.diagnostics, []);
      assert.equal(compiled.node.type, "paintGroup");
      const bytes = brandingDemo("Studio proposal", { palette, logoSize });
      const content = new TextDecoder().decode(bytes);
      assert.doesNotMatch(content, /\/Subtype\s*\/Image/);
      assert.match(content, /\bc\b/);
      if (palette !== "ocean" || logoSize !== 56) assert.notDeepEqual(bytes, original);
    }
  }
  for (const logoSize of [31, 81, 55.5, NaN])
    assert.throws(() => validateBranding({ palette: "ocean", logoSize }), /32 to 80/);
  assert.throws(() => validateBranding({ palette: "unknown", logoSize: 56 } as unknown as typeof brandingDefaults));
  assert.throws(() => brandingDemo("x".repeat(41)), /40 characters/);
  assert.ok(brandingDemo("W".repeat(40)).length > 0);
});

async function actualSource(page: Page): Promise<void> {
  const files = ["branding.ts", "branding-logo.ts", "branding-controls.ts"];
  const contents = await Promise.all(
    files.map((file) => readFile(new URL(`../../apps/showcase/src/${file}`, import.meta.url), "utf8")),
  );
  assert.equal(
    await page.locator("#source").textContent(),
    files.map((file, i) => `// ${file}\n${contents[i]}`).join("\n"),
  );
}

test("branding live controls, keyboard, source snapshots and downloaded preview stay matched", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 1280, height: 960 } });
    const errors = pageErrors(page);
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto(app.url);
    await rendered(page);
    assert.equal(
      requests.some((url) => /optional-branding-|fontkit-|\/svg-/.test(url)),
      false,
    );
    await page.locator("#example").selectOption("branding");
    const original = await rendered(page);
    assert.deepEqual(await pdf(page, "s7-branding-default.pdf"), brandingDemo("Hello portable PDF"));
    await actualSource(page);
    await screenshot(page, "s7-branding-desktop");
    await exerciseControls(page, original);
    await checkReset(page);
    const path = new URL("../../artifacts/showcase/s7-branding-edited.pdf", import.meta.url).pathname;
    execFileSync("qpdf", ["--check", path]);
    const text = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" });
    assert.match(text, /Studio proposal/);
    assert.match(text, /ORIGINAL SAMPLE IDENTITY/);
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

async function exerciseControls(page: Page, original: number[]): Promise<void> {
  await page.locator("#title").fill("Studio proposal");
  await page.getByLabel("Header logo size (PDF points)", { exact: true }).fill("80");
  await page.locator("#brand-logo-size").press("Tab");
  assert.equal(await page.locator("#brand-palette").evaluate((el) => el === document.activeElement), true);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Tab");
  assert.equal(await page.locator("#brand-palette").inputValue(), "plum");
  assert.deepEqual(
    await pdf(page, "s7-branding-edited.pdf"),
    brandingDemo("Studio proposal", { logoSize: 80, palette: "plum" }),
  );
  assert.notDeepEqual(await rendered(page), original);
  assert.deepEqual(JSON.parse((await page.locator("#source-arguments").textContent()) ?? ""), {
    demo: "branding",
    title: "Studio proposal",
    controls: { logoSize: 80, palette: "plum" },
  });
  assert.equal(
    await page.locator("#brand-logo").getAttribute("src"),
    `data:image/svg+xml,${encodeURIComponent(brandingLogo("plum"))}`,
  );
  await page.locator("#example-code summary").focus();
  await page.keyboard.press("Enter");
  await actualSource(page);
  await screenshot(page, "s7-branding-desktop-source");
}

async function checkReset(page: Page): Promise<void> {
  const href = await page.locator("#download").getAttribute("href");
  await page.locator("#brand-logo-size").fill("81");
  await page.locator('#demo-form[aria-busy="false"]').waitFor();
  assert.equal(await page.locator("#brand-logo-size").getAttribute("aria-invalid"), "true");
  assert.match(
    (await page.locator("#brand-logo-size").getAttribute("aria-describedby")) ?? "",
    /brand-size-help input-error/,
  );
  assert.equal(await page.locator("#download").getAttribute("href"), href);
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  assert.deepEqual(await pdf(page, "s7-branding-reset.pdf"), brandingDemo("Hello portable PDF"));
  assert.equal(await page.locator("#example").inputValue(), "branding");
  assert.equal(await page.locator("#brand-logo-size").inputValue(), "56");
  assert.equal(await page.locator("#brand-palette").inputValue(), "ocean");
  assert.equal(await page.locator("#brand-logo-size").getAttribute("aria-describedby"), "brand-size-help");
}

test("branding mobile layout and palette edits are visible without horizontal overflow", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto(app.url);
    await page.locator("#example").selectOption("branding");
    await rendered(page);
    const before = await page.locator("#preview canvas").evaluate((el) => (el as HTMLCanvasElement).toDataURL());
    await page.locator("#brand-palette").selectOption("ember");
    assert.deepEqual(
      await pdf(page, "s7-branding-mobile.pdf"),
      brandingDemo("Hello portable PDF", { logoSize: 56, palette: "ember" }),
    );
    await rendered(page);
    const after = await page.locator("#preview canvas").evaluate((el) => (el as HTMLCanvasElement).toDataURL());
    assert.notEqual(after, before);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await screenshot(page, "s7-branding-mobile");
  } finally {
    await app.close();
  }
});
