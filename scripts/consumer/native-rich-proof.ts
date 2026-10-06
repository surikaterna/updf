import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

function load(root: string) {
  const require = createRequire(join(root, "package.json"));
  return { core: require("@updf/core"), fonts: require("@updf/fonts"), text: require("@updf/text") };
}
const before = load(resolve(process.argv[2]!));
const after = load(process.cwd());
const prepared = {
  ...JSON.parse(await readFile("tests/fixtures/fonts/liberation-sans.json", "utf8")),
  bytes: new Uint8Array(await readFile("tests/fixtures/fonts/LiberationSans-Regular.ttf")),
};
const output = await mkdtemp("/tmp/opencode/native-rich-e2-");

function render(library: ReturnType<typeof load>, font: string, align: string, text: string) {
  const runtime = library.fonts.fontRuntime();
  const resource = font === "prepared" ? library.fonts.createPreparedFont(prepared) : library.fonts.createHelvetica();
  return library.core.render(
    {
      version: 1,
      pages: [
        {
          width: 200,
          height: 100,
          children: [
            {
              type: "richText",
              x: 10,
              y: 10,
              width: 180,
              height: 80,
              paragraphs: [
                {
                  runs: [{ text }],
                  defaultStyle: { font: "Demo", fontSize: 10, color: [0, 0, 0] },
                  lineHeight: 12,
                  align,
                  whiteSpace: "preserve",
                  breakLongWords: "error",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      resources: { Demo: resource },
      text: library.text.createTextService({ runtime }),
      providers: [library.fonts.fontProvider(runtime)],
    },
  );
}

async function compare(font: string, align: string, text: string, index: number) {
  const old = render(before, font, align, text),
    current = render(after, font, align, text);
  assert.deepEqual(current, old, `${font}/${align}: canonical rich PDF bytes`);
  const paths = [join(output, `${index}-before.pdf`), join(output, `${index}-after.pdf`)];
  await writeFile(paths[0]!, old);
  await writeFile(paths[1]!, current);
  for (const path of paths) execFileSync("qpdf", ["--check", path]);
  const bounds = paths.map((path) => execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" }));
  assert.equal(bounds[1], bounds[0], `${font}/${align}: extracted text and bounds`);
  for (const path of paths) execFileSync("pdftoppm", ["-r", "72", "-singlefile", path, path]);
  assert.deepEqual(await readFile(`${paths[1]}.ppm`), await readFile(`${paths[0]}.ppm`), `${font}/${align}: raster`);
}

let comparisons = 0;
for (const font of ["helvetica", "prepared"]) {
  for (const align of ["left", "center", "right"]) {
    for (const text of ["AB", "A\ng", " A B ", "", font === "prepared" ? "Привет\nМосква" : "Hello\nPDF"]) {
      await compare(font, align, text, comparisons++);
    }
  }
}
console.log({
  comparisons,
  output,
  checks: "rich bytes, qpdf, extracted text/bbox, 72-dpi raster",
  sizes: "separate sizes.ts rich-vs-rich reports",
});
