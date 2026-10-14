import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { source, tsxPDF, xmlPDF } from "../fixtures/svg-authoring/parity.js";
import { acceptable, compare } from "../svg-reference/compare.js";
import { native } from "../svg-reference/native.js";
import { readPNG } from "../svg-reference/pdf.js";

async function browserModule(): Promise<string> {
  const result = await build({
    stdin: {
      contents: 'export {xmlPDF,tsxPDF} from "./tests/fixtures/svg-authoring/parity.tsx";',
      resolveDir: process.cwd(),
    },
    bundle: true,
    platform: "browser",
    conditions: ["browser"],
    format: "esm",
    target: "es2022",
    jsx: "automatic",
    write: false,
  });
  return `data:text/javascript;base64,${Buffer.from(result.outputFiles[0]?.contents ?? []).toString("base64")}`;
}

test("SVG-only XML/TSX: Node/Chromium PDF parity, qpdf validation and native SVG raster reference", async () => {
  const moduleURL = await browserModule();
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_CHROMIUM ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const artifacts = new URL("../../artifacts/", import.meta.url);
  await mkdir(artifacts, { recursive: true });
  try {
    const page = await browser.newPage();
    for (const fill of ["red", "blue"]) {
      const expected = xmlPDF(fill);
      assert.deepEqual(tsxPDF(fill), expected);
      const actual = await page.evaluate(
        async ({ moduleURL, fill }) => {
          const module = await import(moduleURL);
          return { xml: Array.from(module.xmlPDF(fill)), tsx: Array.from(module.tsxPDF(fill)) };
        },
        { moduleURL, fill },
      );
      assert.deepEqual(actual.xml, Array.from(expected));
      assert.deepEqual(actual.tsx, actual.xml);
      const path = new URL(`svg-only-${fill}.pdf`, artifacts).pathname;
      await writeFile(path, expected);
      execFileSync("qpdf", ["--check", path]);
      execFileSync("pdftocairo", ["-r", "144", "-singlefile", "-png", path, path.slice(0, -4)]);
      const raster = await readPNG(page, await readFile(`${path.slice(0, -4)}.png`), 200, 120);
      const reference = await native(page, source(fill), 200, 120, { x: 10, y: 10, w: 80, h: 40 });
      const report = compare(reference, raster);
      await writeFile(new URL(`svg-only-${fill}.json`, artifacts), `${JSON.stringify(report, null, 2)}\n`);
      assert.ok(acceptable(report), JSON.stringify(report));
    }
  } finally {
    await browser.close();
  }
});
