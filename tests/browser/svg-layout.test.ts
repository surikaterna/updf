import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium, type Page } from "playwright";
import { layoutParity } from "../fixtures/svg-authoring/layout-parity.js";
import { readPNG } from "../svg-reference/pdf.js";

async function raster(page: Page, bytes: Uint8Array, name: string, pages: number, height: number) {
  const prefix = new URL(`../../artifacts/svg-layout-${name}`, import.meta.url).pathname;
  await writeFile(`${prefix}.pdf`, bytes);
  execFileSync("qpdf", ["--check", `${prefix}.pdf`]);
  assert.equal(Number(execFileSync("qpdf", ["--show-npages", `${prefix}.pdf`], { encoding: "utf8" })), pages);
  for (let index = 1; index <= pages; index++) {
    const output = `${prefix}-${index}`;
    execFileSync("pdftocairo", [
      "-r",
      "720",
      "-f",
      String(index),
      "-l",
      String(index),
      "-singlefile",
      "-png",
      `${prefix}.pdf`,
      output,
    ]);
    const png = await readFile(`${output}.png`);
    const pixels = png.readUInt32BE(20);
    assert.ok(pixels >= Math.ceil(height * 10) && pixels <= Math.ceil(height * 10) + 1);
    const image = await readPNG(page, png, 200, pixels);
    assert.ok(
      image.rgb.some((value) => value < 128),
      "nonempty SVG raster",
    );
  }
}

test("canonical SVG layout XML/TSX Node/Chromium parity and raster for certified fit/native refusal", async () => {
  const bundled = await build({
    stdin: {
      contents: 'export {layoutParity} from "./tests/fixtures/svg-authoring/layout-parity.tsx";',
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
  const url = `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0]!.contents).toString("base64")}`;
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_CHROMIUM ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  await mkdir(new URL("../../artifacts/", import.meta.url), { recursive: true });
  try {
    const page = await browser.newPage();
    for (const refused of [false, true]) {
      const expected = layoutParity(false, refused);
      assert.deepEqual(layoutParity(true, refused), expected);
      assert.equal(expected.pages, refused ? 2 : 1);
      const actual = await page.evaluate(
        async ({ url, refused }) => {
          const module = await import(url);
          return [false, true].map((structured) => {
            const result = module.layoutParity(structured, refused);
            return { ...result, pdf: Array.from(result.pdf), inlinePDF: Array.from(result.inlinePDF) };
          });
        },
        { url, refused },
      );
      const comparable = { ...expected, pdf: Array.from(expected.pdf), inlinePDF: Array.from(expected.inlinePDF) };
      assert.deepEqual(actual, [comparable, comparable]);
      await raster(page, expected.pdf, String(refused), expected.pages, refused ? 0.3 : 2.3);
      await raster(page, expected.inlinePDF, `inline-${refused}`, 1, 10);
    }
  } finally {
    await browser.close();
  }
});
