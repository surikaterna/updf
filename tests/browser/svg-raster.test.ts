import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { chromium, type Page } from "playwright";
import { signatureLikeSVG } from "../../apps/node/src/svg-fixtures.js";
import { acceptable, compare, type Image } from "../svg-reference/compare.js";
import { native } from "../svg-reference/native.js";
import { pdf, readPNG } from "../svg-reference/pdf.js";

const artifacts = new URL("../../artifacts/", import.meta.url);
async function splash(name: string): Promise<Image> {
  const prefix = new URL(`svg-${name}`, artifacts).pathname;
  execFileSync("pdftoppm", ["-r", "144", "-singlefile", `${prefix}.pdf`, prefix]);
  const bytes = await readFile(`${prefix}.ppm`);
  const header = bytes.toString("ascii", 0, 100).match(/^P6\s+(\d+)\s+(\d+)\s+255\s/);
  assert.ok(header);
  return { width: Number(header[1]), height: Number(header[2]), rgb: new Uint8Array(bytes.subarray(header[0].length)) };
}
function mass(image: Image): number {
  let total = 0;
  for (let i = 0; i < image.rgb.length; i += 3) {
    const strength = 255 - Math.min(image.rgb[i] ?? 255, image.rgb[i + 1] ?? 255, image.rgb[i + 2] ?? 255);
    if (strength > 3) total += strength / 255;
  }
  return total;
}
async function calibration(page: Page): Promise<void> {
  const reports = [];
  for (const width of [0.6, 1, 1.35, 1.5, 2.7, 3]) {
    for (const y of [20, 20.15, 20.3]) {
      const source = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><path d="M10 ${y}h100" fill="none" stroke="blue" stroke-width="${width}"/></svg>`;
      const name = `svg50-area-${width}-${y}`;
      const raster = await pdf(page, source, 120, 60, name);
      const oldRaster = await splash(name);
      const reference = await native(page, source, 240, 120);
      const expected = 400 * width;
      reports.push({
        width,
        y,
        expected,
        actual: mass(raster),
        splash: mass(oldRaster),
        native: mass(reference),
        nativeCairo: acceptable(compare(reference, raster)),
        nativeSplash: acceptable(compare(reference, oldRaster)),
      });
    }
  }
  await writeFile(new URL("svg50-area.json", artifacts), `${JSON.stringify(reports, null, 2)}\n`);
  for (const report of reports)
    assert.ok(Math.abs(report.actual - report.expected) / report.expected < 0.01, JSON.stringify(report));
}
async function corruptedPNG(page: Page, source: string, black: boolean): Promise<Uint8Array> {
  const result = await page.evaluate(
    async ({ source, black }) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Missing corruption canvas");
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        if (black) pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 0;
        else if ((pixels.data[i + 2] ?? 0) > (pixels.data[i] ?? 255)) {
          const blue = pixels.data[i + 2] ?? 255;
          pixels.data[i + 2] = pixels.data[i + 1] ?? 255;
          pixels.data[i + 1] = blue;
        }
      }
      context.putImageData(pixels, 0, 0);
      return canvas.toDataURL("image/png");
    },
    { source, black },
  );
  return Buffer.from(result.split(",")[1] ?? "", "base64");
}
async function controls(page: Page): Promise<void> {
  const reference = await native(page, signatureLikeSVG, 640, 400);
  const good = await pdf(page, signatureLikeSVG, 320, 200, "svg50-good");
  const bytes = await readFile(new URL("svg-svg50-good.pdf", artifacts));
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "86512743798e0a4be7ddd1c17dac4042572d92a6e861e65d53da0f95ebed715e",
    "The original signature PDF golden must not change for a raster-harness correction",
  );
  const decoded = await readPNG(page, Buffer.from(reference.png.split(",")[1] ?? "", "base64"), 640, 400);
  assert.deepEqual(decoded.rgb, reference.rgb);
  const reports = [{ name: "correct", ...compare(reference, good) }];
  const mutations = [
    ["thin", signatureLikeSVG.replace("stroke-width:1.5", "stroke-width:.3")],
    ["wrong-color", signatureLikeSVG.replace("stroke:blue", "stroke:green")],
    ["missing", signatureLikeSVG.replace(/d="M0[^"]*"/, 'd="M6 66h114"')],
    ["displaced", signatureLikeSVG.replace("translate(12,28)", "translate(14,28)")],
    ["opacity", signatureLikeSVG.replace("stroke:blue", "stroke:blue;stroke-opacity:.5")],
    [
      "black",
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200"/></svg>',
    ],
  ];
  for (const [name, source] of mutations) {
    assert.ok(name && source && source !== signatureLikeSVG);
    const raster = await pdf(page, source, 320, 200, `svg50-bad-${name}`);
    reports.push({ name, ...compare(reference, raster) });
  }
  for (const black of [false, true]) {
    const bytes = await corruptedPNG(page, reference.png, black);
    const name = black ? "png-black" : "png-wrong-color";
    await writeFile(new URL(`svg50-${name}.png`, artifacts), bytes);
    reports.push({ name, ...compare(reference, await readPNG(page, bytes, 640, 400)) });
  }
  await writeFile(new URL("svg50-controls.json", artifacts), `${JSON.stringify(reports, null, 2)}\n`);
  const correct = reports[0];
  assert.ok(correct);
  assert.ok(acceptable(correct), JSON.stringify(correct));
  for (const report of reports.slice(1)) assert.ok(!acceptable(report), JSON.stringify(report));
}

test("SVG PDF raster preserves analytic fractional stroke area and rejects PDF/PNG corruption", async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_CHROMIUM ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  await mkdir(artifacts, { recursive: true });
  try {
    const page = await browser.newPage();
    await calibration(page);
    await controls(page);
  } finally {
    await browser.close();
  }
});
