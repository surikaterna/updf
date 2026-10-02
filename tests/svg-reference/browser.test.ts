import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { render } from "@updf/core";
import type { SVGTarget } from "@updf/svg";
import { compileSVG } from "@updf/svg";
import { chromium, type Page } from "playwright";
import { aspectSVG, logoLikeSVG, quotedNoneSVG, signatureLikeSVG } from "../../apps/node/src/svg-fixtures.js";
import { acceptable, compare, type Image } from "./compare.js";

async function native(
  page: Page,
  source: string,
  width: number,
  height: number,
  placement?: SVGTarget,
): Promise<Image & { readonly png: string }> {
  const viewport = placement ?? { x: 0, y: 0, w: width / 2, h: height / 2 };
  const result = await page.evaluate(
    async ({ source, width, height, viewport }) => {
      const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml" }));
      try {
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("Native SVG decode failed"));
          image.src = url;
        });
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Missing reference canvas");
        context.fillStyle = "white";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, viewport.x * 2, viewport.y * 2, viewport.w * 2, viewport.h * 2);
        const rgba = context.getImageData(0, 0, width, height).data;
        const rgb: number[] = [];
        for (let i = 0; i < rgba.length; i += 4) rgb.push(rgba[i] ?? 255, rgba[i + 1] ?? 255, rgba[i + 2] ?? 255);
        return { rgb, png: canvas.toDataURL("image/png") };
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    { source, width, height, viewport },
  );
  return { width, height, rgb: new Uint8Array(result.rgb), png: result.png };
}
async function pdf(source: string, width: number, height: number, name: string, placement?: SVGTarget): Promise<Image> {
  const node = compileSVG(source, placement ?? { x: 0, y: 0, w: width, h: height }).node;
  const path = new URL(`../../artifacts/svg-${name}.pdf`, import.meta.url).pathname;
  await writeFile(path, render({ version: 1, pages: [{ width, height, children: [node] }] }));
  execFileSync("qpdf", ["--check", path]);
  const prefix = path.slice(0, -4);
  execFileSync("pdftoppm", ["-r", "144", "-singlefile", path, prefix]);
  const bytes = await readFile(`${prefix}.ppm`);
  const header = bytes.toString("ascii", 0, 100).match(/^P6\s+(\d+)\s+(\d+)\s+255\s/);
  assert.ok(header && Number(header[1]) === width * 2 && Number(header[2]) === height * 2);
  execFileSync("pdftoppm", ["-r", "144", "-singlefile", "-png", path, prefix]);
  return { width: width * 2, height: height * 2, rgb: new Uint8Array(bytes.subarray(header[0].length)) };
}

const cases: readonly { name: string; source: string; w: number; h: number; placement?: SVGTarget }[] = [
  { name: "logo", source: logoLikeSVG, w: 320, h: 200 },
  { name: "signature", source: signatureLikeSVG, w: 320, h: 200 },
  ...["xMidYMid meet", "xMaxYMin slice", "none"].map((value, i) => ({
    name: `aspect-${i}`,
    source: aspectSVG(value),
    w: 160,
    h: 160,
  })),
  { name: "quoted-none", source: quotedNoneSVG, w: 100, h: 100 },
  {
    name: "nested-viewport",
    source:
      '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><svg x="120" y="120" width="80" height="80" viewBox="0 0 10 10"><rect width="10" height="10" fill="red"/></svg></svg>',
    w: 160,
    h: 160,
  },
  {
    name: "root-translate",
    source:
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 10 10" transform="translate(5 0)"><rect width="2" height="2" fill="red"/></svg>',
    w: 100,
    h: 100,
  },
  {
    name: "root-rotate-aligned",
    source:
      '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="10 20 120 60" preserveAspectRatio="xMaxYMin meet" transform="rotate(10 80 80)"><rect x="20" y="30" width="60" height="30" fill="blue"/></svg>',
    w: 160,
    h: 160,
  },
  {
    name: "root-scale",
    source:
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 10 10" transform="scale(1.25)"><rect x="3" y="3" width="4" height="4" fill="green"/></svg>',
    w: 100,
    h: 100,
  },
  {
    name: "root-rotation-position",
    source:
      '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="10 20 120 60" preserveAspectRatio="xMaxYMin meet" transform="rotate(10 80 80)"><rect x="20" y="30" width="60" height="30" fill="blue"/></svg>',
    w: 200,
    h: 200,
    placement: { x: 25, y: 35, w: 160, h: 160 },
  },
];

test("native Chromium SVG versus PDF Poppler raster: bounded bbox/edge-band/interior tolerance", async () => {
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
  const artifacts = new URL("../../artifacts/", import.meta.url);
  await mkdir(artifacts, { recursive: true });
  const reports = [];
  try {
    const page = await browser.newPage();
    for (const item of cases) {
      const reference = await native(page, item.source, item.w * 2, item.h * 2, item.placement);
      await writeFile(
        new URL(`svg-native-${item.name}.png`, artifacts),
        Buffer.from(reference.png.split(",")[1] ?? "", "base64"),
      );
      const raster = await pdf(item.source, item.w, item.h, item.name, item.placement);
      const result = compare(reference, raster);
      reports.push({ name: item.name, ...result });
      assert.ok(acceptable(result), `${item.name}: ${JSON.stringify(result)}`);
    }
    await writeFile(new URL("svg-comparison.json", artifacts), JSON.stringify(reports, null, 2) + "\n");
  } finally {
    await browser.close();
  }
});
