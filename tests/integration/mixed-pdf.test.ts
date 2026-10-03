import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { type DocumentDefinition, render } from "@updf/core";
import { h, useContext } from "@updf/core/vdom";
import { Document, Flow, layout, Page, PageContext, Paragraph, pageSize } from "@updf/layout";

const directory = new URL("../../artifacts/mixed/", import.meta.url);
function label(text: string) {
  return h("text", { x: 0, y: 0, width: 180, height: 12, text, fontSize: 10, lineHeight: 12, align: "left" });
}
function Footer() {
  const page = useContext(PageContext);
  return h("paintGroup", {
    children: [
      h("rect", { x: 0, y: 0, width: 180, height: 3, paint: { fill: [0, 0, 1], stroke: null } }),
      label(`Page ${page.docPageNumber}/${page.docPageCount}`),
    ],
  });
}
function definition() {
  return layout(
    h(Document, {
      children: [
        h(Page, { size: pageSize(200, 110), children: label("COVER") }),
        h(Flow, {
          pageSize: pageSize(200, 100),
          margins: { top: 10, right: 10, bottom: 10, left: 10 },
          children: [
            h(Flow.Header, { height: 12, children: label("HEADER") }),
            h(Flow.Body, {
              children: h(Paragraph, {
                children: Array.from({ length: 9 }, (_, index) => `L${index + 1}`).join("\n"),
                whiteSpace: "preserve" as const,
                lineHeight: 12,
                defaultStyle: { fontSize: 10, color: [1, 0, 0] as const },
              }),
            }),
            h(Flow.Footer, { height: 12, children: h(Footer, {}) }),
          ],
        }),
        h(Page, { size: pageSize(200, 120), children: label("APPENDIX") }),
        h(Flow, {
          pageSize: pageSize(200, 100),
          margins: { top: 10, right: 10, bottom: 10, left: 10 },
          children: h(Flow.Footer, { height: 12, children: h(Footer, {}) }),
        }),
      ],
    }),
  );
}
test("mixed real PDF preserves ordered sections, serial final footers and separated body/footer raster ink", async () => {
  await mkdir(directory, { recursive: true });
  const result = definition();
  assert.equal(result.pageCount, 6);
  const path = new URL("mixed.pdf", directory).pathname;
  await writeFile(path, render(result.document));
  execFileSync("qpdf", ["--check", path]);
  const text = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" }).trim().split("\f");
  assert.equal(text.length, 6);
  assert.match(text[0] ?? "", /COVER/);
  assert.match(text[4] ?? "", /APPENDIX/);
  for (const number of [2, 3, 4, 6]) assert.ok(text[number - 1]?.includes(`Page ${number}/6`));
  for (const number of [2, 3, 4]) assert.match(text[number - 1] ?? "", /HEADER[\s\S]*L\d[\s\S]*Page/u);
  assert.deepEqual(
    text.join("").match(/L\d/gu),
    Array.from({ length: 9 }, (_, index) => `L${index + 1}`),
  );
  for (const index of [1, 2, 3]) assertInk(await raster(result.document, index, `flow-${index}`));
  const page = result.document.pages[1];
  assert.ok(page);
  const footer = page.children.at(-1);
  assert.ok(footer?.type === "paintGroup");
  const changed = {
    ...page,
    children: [...page.children.slice(0, -1), { ...footer, transform: [1, 0, 0, 1, 10, 22] as const }],
  };
  const mutant = {
    ...result.document,
    pages: result.document.pages.map((value, index) => (index === 1 ? changed : value)),
  };
  assert.throws(() => assertInk(rasterSync(mutant, 1)), /footer ink/);
});
async function raster(document: DocumentDefinition, index: number, name: string) {
  const path = new URL(`${name}.pdf`, directory).pathname;
  const prefix = new URL(name, directory).pathname;
  const page = document.pages[index];
  assert.ok(page);
  await writeFile(path, render({ version: 1, pages: [page] }));
  execFileSync("pdftoppm", ["-r", "72", "-singlefile", path, prefix]);
  return readFile(`${prefix}.ppm`);
}
function rasterSync(document: DocumentDefinition, index: number) {
  const page = document.pages[index];
  assert.ok(page);
  const bytes = render({ version: 1, pages: [page] });
  return execFileSync("pdftoppm", ["-r", "72", "-singlefile", "-"], { input: bytes });
}
function assertInk(ppm: Buffer): void {
  assert.match(ppm.subarray(0, 30).toString("ascii"), /^P6\s+200 100\s+255\s/u);
  const rgb = ppm.subarray(ppm.indexOf(Buffer.from("\n255\n")) + 5);
  let red = 0,
    blue = 0;
  for (let offset = 0; offset < rgb.length; offset += 3) {
    const r = rgb[offset] ?? 255,
      g = rgb[offset + 1] ?? 255,
      b = rgb[offset + 2] ?? 255;
    const y = Math.floor(offset / 3 / 200),
      x = (offset / 3) % 200;
    if (r > 150 && g < 100 && b < 100) {
      red++;
      assert.ok(x >= 10 && x < 190 && y >= 22 && y < 78, "body ink exceeds reservation");
    }
    if (b > 150 && r < 100 && g < 100) {
      blue++;
      assert.ok(x >= 10 && x < 190 && y >= 78 && y < 81, "footer ink overlaps body");
    }
  }
  assert.ok(red > 10 && blue > 100);
}
