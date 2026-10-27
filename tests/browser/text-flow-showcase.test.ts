import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { Page } from "playwright";
import { eeveeUrl, wrappingNotice } from "../../apps/showcase/src/text-flow-asset.js";
import { pageErrors, pdf, rendered, screenshot, site } from "../showcase/helpers.js";

test("showcase left/right: actual external Eevee, lazy addon, worker preview and downloadable multi-page PDF", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = pageErrors(page);
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    if (process.env.TEXT_FLOW_SHOWCASE_PNG) {
      const body = await readFile(process.env.TEXT_FLOW_SHOWCASE_PNG);
      await page.route(eeveeUrl, (route) => route.fulfill({ body, contentType: "image/png" }));
    }
    await page.goto(process.env.TEXT_FLOW_SHOWCASE_URL ?? app.url);
    await pdf(page);
    assert.ok(!requests.some((url) => url.includes("optional-text-flow") || url === eeveeUrl));
    for (const side of ["left", "right"] as const) await scenario(page, side);
    await pathScenario(page);
    assert.ok(requests.some((url) => /pdf\.worker.min-.*\.mjs/.test(url)));
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

async function scenario(page: Page, side: "left" | "right") {
  await page.getByLabel("Example", { exact: true }).selectOption(`text-flow-${side}`);
  const bytes = await pdf(page, `text-flow-showcase-${side}.pdf`);
  assert.match(await page.locator("#demo-purpose").innerText(), /license unknown/);
  assert.ok((await page.locator("#status").innerText()).includes(wrappingNotice));
  assert.ok((await page.locator("#source").textContent())?.includes("floatable(Block)"));
  assert.match((await page.locator("#source").textContent())!, /shapeOutside:\s*Source\.path\(\s*"M46 0 L/);
  const count = await page.locator("#preview canvas").count();
  assert.ok(count >= 2);
  await rendered(page, count);
  await imageInk(page, side);
  assert.match(new TextDecoder().decode(bytes), /\/Subtype \/Image/);
  const path = new URL(`../../artifacts/showcase/text-flow-showcase-${side}.pdf`, import.meta.url).pathname;
  execFileSync("qpdf", ["--check", path]);
  const text = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" });
  assert.equal(normalize(text), normalize(expectedText(side, await page.locator("#title").inputValue())));
  const images = execFileSync("pdfimages", ["-list", path], { encoding: "utf8" });
  assert.equal(images.split("\n").filter((line) => /^\s*1\s+\d+\s+image\s/.test(line)).length, 1);
  assert.equal(images.split("\n").filter((line) => /^\s*1\s+\d+\s+smask\s/.test(line)).length, 1);
  assert.equal(images.split("\n").filter((line) => /^\s*[2-9]\d*\s+\d+\s+(image|smask)\s/.test(line)).length, 0);
  const words = await contourGeometry(page, path, side);
  await page.locator("#result-state").filter({ hasText: "Current result" }).waitFor();
  await screenshot(page, `text-flow-showcase-${side}`);
  await overlay(page, words, side);
}

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function expectedText(side: string, title: string) {
  const continuation =
    "Ordinary paragraphs continue naturally across pages. The image paints once, and lines below its authored outline return to the full body width. The changing side interval follows a manually drawn polygon, not automatic transparency extraction. ";
  return `${title} Eevee on the ${side}. A real PNG beside rich text. This short first paragraph shares the authored silhouette with the next ordinary sibling. ${continuation.repeat(8)} End of authored path flow. ${wrappingNotice} External reference demo only: Eevee PNG from IconScout, referenced by theosoti on CodePen (ogjjged). License unknown; no package redistribution license asserted.`;
}

async function contourGeometry(page: Page, path: string, side: "left" | "right") {
  const bbox = execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" }).split("</page>")[0]!;
  const words = [...bbox.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)"/g)].map(
    (match) => match.slice(1).map(Number),
  );
  const sideWords = words.filter((word) => word[1]! >= 52 && word[3]! < 210);
  const lines = new Map<number, number[]>();
  for (const word of sideWords) lines.set(word[1]!, [...(lines.get(word[1]!) ?? []), ...[word[0]!, word[2]!]]);
  const edges = [...lines.values()].map((line) => (side === "left" ? Math.min(...line) : Math.max(...line)));
  assert.ok(Math.max(...edges) - Math.min(...edges) > 25, `Expected changing ${side} contour intervals: ${edges}`);
  assert.ok(
    side === "left" ? Math.min(...edges) < 167 : Math.max(...edges) > 303,
    "Text enters the transparent box margin",
  );
  await artworkPixels(page, words, side);
  return words;
}

async function overlay(page: Page, words: number[][], side: "left" | "right") {
  const d = /shapeOutside:\s*Source\.path\(\s*"([^"]+)"/.exec((await page.locator("#source").textContent())!)![1]!;
  const canvas = page.locator("#preview canvas").first();
  await canvas.evaluate(
    (element, { d, words, side }) => {
      const canvas = element as HTMLCanvasElement;
      const context = canvas.getContext("2d")!;
      context.save();
      context.scale(canvas.width / 480, canvas.width / 480);
      const origin = side === "left" ? 28 : 288;
      context.translate(origin, 52);
      context.strokeStyle = "#009944";
      context.lineWidth = 0.6;
      context.stroke(new Path2D(d));
      context.translate(-origin, -52);
      context.strokeStyle = "#7259b5";
      context.lineWidth = 0.2;
      for (const [x0, y0, x1, y1] of words) context.strokeRect(x0!, y0!, x1! - x0!, y1! - y0!);
      context.restore();
    },
    { d, words, side },
  );
  await canvas.screenshot({
    path: new URL(`../../artifacts/showcase/text-flow-showcase-${side}-overlay.png`, import.meta.url).pathname,
  });
}

async function artworkPixels(page: Page, words: number[][], side: "left" | "right") {
  const source = (await page.locator("#source").textContent())!;
  const d = /shapeOutside:\s*Source\.path\(\s*"([^"]+)"/.exec(source)![1]!;
  const result = await page.evaluate(
    async ({ url, words, side, d }) => {
      const bitmap = await createImageBitmap(await (await fetch(url)).blob());
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 512;
        const context = canvas.getContext("2d")!;
        context.drawImage(bitmap, 0, 0);
        const pixels = context.getImageData(0, 0, 512, 512).data;
        const origin = side === "left" ? 28 : 288;
        const outline = new Path2D(d);
        let overlap = 0;
        let outside = 0;
        const outsideBands: Record<number, number[]> = {};
        for (let i = 0; i < 512 * 512; i++) {
          if (pixels[i * 4 + 3]! <= 16) continue;
          const x = ((i % 512) * 164) / 512;
          const y = (Math.floor(i / 512) * 164) / 512;
          if (!context.isPointInPath(outline, x, y)) {
            outside++;
            const band = Math.floor(y / 10) * 10;
            outsideBands[band] = [Math.min(outsideBands[band]?.[0] ?? x, x), Math.max(outsideBands[band]?.[1] ?? x, x)];
          }
          if (words.some(([x0, y0, x1, y1]) => x + origin >= x0! && x + origin < x1! && y + 52 >= y0! && y + 52 < y1!))
            overlap++;
        }
        return { overlap, outside, outsideBands };
      } finally {
        bitmap.close();
      }
    },
    { url: eeveeUrl, words, side, d },
  );
  assert.equal(result.overlap, 0, "Text word boxes must not cross actual artwork alpha pixels");
  assert.equal(result.outside, 0, `Polygon coverage: ${JSON.stringify(result.outsideBands)}`);
}

async function pathScenario(page: Page) {
  await page.getByLabel("Example", { exact: true }).selectOption("text-flow-path");
  const bytes = await pdf(page, "text-flow-showcase-path.pdf");
  const source = await page.locator("#source").textContent();
  assert.match(source!, /<FloatingPath/);
  assert.match(source!, /floatable\(Path\)/);
  assert.match(source!, /d="M0 0 H160 L70 48/);
  assert.doesNotMatch(source!, /fixed|EeveeImage|nativeLeaf/);
  assert.doesNotMatch(new TextDecoder().decode(bytes), /\/Subtype \/Image/);
  const path = new URL("../../artifacts/showcase/text-flow-showcase-path.pdf", import.meta.url).pathname;
  execFileSync("qpdf", ["--check", path]);
  const text = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" });
  assert.match(normalize(text), /A real filled Path\. One authored geometry paints and wraps\./);
  assert.doesNotMatch(text, /<FloatingPath|createTextFlow|shapeOutside/);
  await rendered(page, await page.locator("#preview canvas").count());
  const blue = await page
    .locator("#preview canvas")
    .first()
    .evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (Math.abs(pixels[i]! - 52) < 4 && Math.abs(pixels[i + 1]! - 152) < 4 && Math.abs(pixels[i + 2]! - 219) < 4)
          count++;
      }
      return count;
    });
  assert.ok(blue > 1000, `Expected painted #3498db Path, got ${blue} blue pixels`);
  await screenshot(page, "text-flow-showcase-path");
}

async function imageInk(page: Page, side: "left" | "right") {
  const brown = await page
    .locator("#preview canvas")
    .first()
    .evaluate((element, side) => {
      const canvas = element as HTMLCanvasElement;
      const context = canvas.getContext("2d")!;
      const scale = canvas.width / 480;
      const x = side === "left" ? 28 : 480 - 28 - 164;
      const data = context.getImageData(x * scale, 52 * scale, 164 * scale, 164 * scale).data;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i]! > data[i + 1]! * 1.15 && data[i + 1]! > data[i + 2]! * 1.2) count++;
      }
      return count;
    }, side);
  assert.ok(brown > 1000, `Expected actual brown Eevee pixels on ${side}, got ${brown}`);
}

test("external PNG failure is readable and a core example still works", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.route(eeveeUrl, (route) => route.abort());
    await page.goto(app.url);
    await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("text-flow-left");
    await page.getByRole("status").filter({ hasText: "External Eevee PNG could not be loaded/validated" }).waitFor();
    await page.getByLabel("Example", { exact: true }).selectOption("text");
    await pdf(page);
    await rendered(page);
  } finally {
    await app.close();
  }
});
