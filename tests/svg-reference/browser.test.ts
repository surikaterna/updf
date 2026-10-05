import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import test from "node:test";
import type { SVGTarget } from "@updf/svg";
import { chromium } from "playwright";
import { aspectSVG, logoLikeSVG, quotedNoneSVG, signatureLikeSVG } from "../../apps/node/src/svg-fixtures.js";
import { acceptable, compare } from "./compare.js";
import { native } from "./native.js";
import { pdf } from "./pdf.js";

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
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_CHROMIUM ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const artifacts = new URL("../../artifacts/", import.meta.url);
  await mkdir(artifacts, { recursive: true });
  const reports = [];
  try {
    const page = await browser.newPage();
    await writeFile(
      new URL("svg-browser-metadata.json", artifacts),
      JSON.stringify(
        {
          browser: browser.version(),
          executablePath: process.env.BROWSER_CHROMIUM ?? "/usr/bin/chromium",
          viewport: page.viewportSize(),
          devicePixelRatio: await page.evaluate(() => devicePixelRatio),
          raster: "Poppler Cairo, 144 DPI, white background, no resize",
        },
        null,
        2,
      ),
    );
    for (const item of cases) {
      const reference = await native(page, item.source, item.w * 2, item.h * 2, item.placement);
      await writeFile(
        new URL(`svg-native-${item.name}.png`, artifacts),
        Buffer.from(reference.png.split(",")[1] ?? "", "base64"),
      );
      const raster = await pdf(page, item.source, item.w, item.h, item.name, item.placement);
      const result = compare(reference, raster);
      reports.push({ name: item.name, ...result });
      await writeFile(new URL("svg-comparison.json", artifacts), `${JSON.stringify(reports, null, 2)}\n`);
      assert.ok(acceptable(result), `${item.name}: ${JSON.stringify(result)}`);
    }
  } finally {
    await browser.close();
  }
});
