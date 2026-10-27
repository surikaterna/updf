import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { preparedImageCostInputs } from "../../scripts/prepared-image-cost-inputs.js";
import { fixture } from "../../packages/png/test/helpers.js";

test("real browser PNG/JPEG ordinary/floated PDFs match Node pixels, text and image/mask counts", async () => {
  const directory = await mkdtemp("/tmp/opencode/updf-prepared-images-browser-");
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.SHOWCASE_CHROMIUM ?? "/usr/bin/chromium",
  });
  try {
    for (const [profile, contents] of Object.entries(fractionalProfiles())) {
      const bytes = profile.endsWith("PNG") ? fixture() : await readFile("tests/fixtures/jpeg/color-2x2.jpg");
      const nodePath = join(directory, `${profile}.mjs`);
      await build({
        stdin: { contents, resolveDir: process.cwd(), loader: "ts" },
        bundle: true,
        platform: "node",
        format: "esm",
        target: "es2022",
        outfile: nodePath,
      });
      const node = new Uint8Array(await (await import(pathToFileURL(nodePath).href)).pdf(bytes));
      const built = await build({
        stdin: { contents, resolveDir: process.cwd(), loader: "ts" },
        bundle: true,
        platform: "browser",
        format: "iife",
        globalName: "PreparedImages",
        target: "es2022",
        write: false,
      });
      const page = await browser.newPage();
      await page.addScriptTag({ content: built.outputFiles[0]!.text });
      const actual = await page.evaluate(
        async (input) => {
          const api = (globalThis as unknown as { PreparedImages: { pdf(bytes: Uint8Array): Promise<Uint8Array> } })
            .PreparedImages;
          return [...(await api.pdf(new Uint8Array(input)))];
        },
        [...bytes],
      );
      await compare(directory, profile, node, new Uint8Array(actual));
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

function fractionalProfiles(): Record<string, string> {
  const profiles = preparedImageCostInputs();
  for (const float of [undefined, "left", "right"] as const) {
    for (const fit of [undefined, "fill"] as const) {
      const source = profiles[float ? "floatPNG" : "ordinaryPNG"]!;
      const key = `${float ? `float-${float}` : "ordinary"}-${fit ?? "contain"}PNG`;
      profiles[key] = source
        .replace("width:120,height:80", "width:100,height:100,maxHeight:80,paddingTop:1.1,paddingBottom:0.1")
        .replace("{src,style:", `{src,${fit ? "fit:'fill'," : ""}style:`)
        .replace("float:'left'", `float:'${float ?? "left"}'`);
    }
  }
  return profiles;
}

async function compare(directory: string, profile: string, node: Uint8Array, browser: Uint8Array) {
  const paths = [join(directory, `${profile}-node.pdf`), join(directory, `${profile}-browser.pdf`)];
  await writeFile(paths[0]!, node);
  await writeFile(paths[1]!, browser);
  const reports = [];
  for (const path of paths) {
    execFileSync("qpdf", ["--check", path]);
    execFileSync("pdftoppm", ["-r", "72", "-singlefile", path, path]);
    reports.push({
      pixels: await readFile(`${path}.ppm`),
      text: execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" }),
      images: execFileSync("pdfimages", ["-list", path], { encoding: "utf8" })
        .split("\n")
        .filter((line) => /^\s*\d+\s+\d+\s+(?:image|smask)\s/u.test(line)),
    });
  }
  assert.deepEqual(reports[0]!.pixels, reports[1]!.pixels);
  assert.equal(reports[0]!.text, reports[1]!.text);
  assert.deepEqual(reports[0]!.images, reports[1]!.images);
  assert.equal(reports[0]!.images.length, profile.endsWith("PNG") ? 2 : 1);
  if (profile.startsWith("float")) assert.match(reports[0]!.text, /rich image/u);
}
