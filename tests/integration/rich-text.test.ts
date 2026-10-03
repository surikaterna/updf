import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { DocumentError, type RichTextNode, render } from "@updf/core";
import { createPreparedFont } from "@updf/core/fonts";
import { measureText, type ParagraphDefinition } from "@updf/core/measurement";
import { type Component, h, lower } from "@updf/core/vdom";
import { fixtureFont, fontInput } from "../fixtures/fonts/font-fixture.js";

const paragraph = (text: string, props: Partial<ParagraphDefinition> = {}): ParagraphDefinition => ({
  runs: [{ text }],
  defaultStyle: { font: "Demo", fontSize: 20, color: [0, 0, 0] },
  lineHeight: 30,
  align: "center",
  whiteSpace: "preserve",
  breakLongWords: "error",
  ...props,
});
function rejects(action: () => unknown, code: string): void {
  assert.throws(action, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code);
}
test("prepared rich Unicode/NBSP, actual bounds, scalar ranges, owned resources and component binding", async () => {
  const font = await fixtureFont();
  const options = { resources: { Demo: font } };
  const input = { kind: "rich", width: 200, paragraphs: [paragraph("А\u00a0Б")] } as const;
  const measured = measureText(input, options);
  assert.equal(measured.lineCount, 1);
  const a = font.metadata.glyphs.find((glyph) => glyph.codePoint === 0x410);
  assert.ok(a);
  const bounds = measured.lines[0]?.fragments[0]?.inkBounds;
  assert.ok(bounds && !bounds.empty);
  const first = measured.lines[0]?.fragments[0];
  assert.ok(first);
  assert.ok(Math.abs(bounds.left - first.x - (a.bounds[0] * 20) / font.metadata.unitsPerEm) < 1e-10);
  rejects(() => measureText({ ...input, width: 15 }, options), "TOKEN_OVERFLOW");
  const component: Component<object> = (_props, context) => {
    assert.deepEqual(context.measurement.measureText(input), measured);
    return null;
  };
  lower(
    h("document", { version: 1, children: h("page", { width: 200, height: 200, children: h(component, {}) }) }),
    options,
  );
  rejects(() => measureText(input, { resources: { Demo: { ...font } } }), "FONT_RESOURCE");
});

test("prepared ink reports actual below-baseline bounds; frozen caller data and resource-map snapshots remain intact", async () => {
  const font = await fixtureFont();
  const resources = { Demo: font };
  const input = Object.freeze({
    kind: "rich",
    width: 200,
    paragraphs: Object.freeze([Object.freeze(paragraph("_"))]),
  } as const);
  const expected = measureText(input, { resources });
  const line = expected.lines[0];
  const bounds = line?.inkBounds;
  const glyph = font.metadata.glyphs.find((item) => item.codePoint === 95);
  assert.ok(line && bounds && !bounds.empty && glyph);
  assert.ok(Math.abs(bounds.top - line.baseline + (glyph.bounds[3] * 20) / font.metadata.unitsPerEm) < 1e-10);
  const other = createPreparedFont({ ...(await fontInput()), glyphs: [{ ...glyph, advance: glyph.advance + 100 }] });
  const component: Component<object> = (_props, context) => {
    resources.Demo = other;
    assert.deepEqual(context.measurement.measureText(input), expected);
    return null;
  };
  lower(h("document", { version: 1, children: h("page", { width: 200, height: 200, children: h(component, {}) }) }), {
    resources,
  });
  assert.equal(resources.Demo, other);
});

test("rich scalar splitting retains UTF16 ranges and refuses horizontal/vertical prepared ink overflow", async () => {
  const font = await fixtureFont();
  const a = font.metadata.glyphs.find((glyph) => glyph.codePoint === 0x410);
  assert.ok(a);
  const data = await fontInput();
  const alias = createPreparedFont({ ...data, glyphs: [a, { ...a, codePoint: 0x1df00 }] });
  const split = measureText(
    {
      kind: "rich",
      width: 15,
      paragraphs: [
        paragraph("\u{1df00}\u{1df00}", {
          breakLongWords: "codePoint",
          align: "center",
        }),
      ],
    },
    { resources: { Demo: alias } },
  );
  assert.equal(split.lineCount, 2);
  assert.deepEqual(
    split.lines.map((line) => line.fragments[0]?.source),
    [
      { start: 0, end: 2 },
      { start: 2, end: 4 },
    ],
  );
  const overhang = createPreparedFont({
    ...data,
    descriptor: { ...font.metadata.descriptor, bounds: [-1000, -1000, 3000, 3000] },
    glyphs: [{ ...a, bounds: [-100, -300, 1800, 2200] }],
  });
  rejects(
    () =>
      measureText(
        { kind: "rich", width: 200, paragraphs: [paragraph("А", { lineHeight: 20 })] },
        { resources: { Demo: overhang } },
      ),
    "FONT_INK",
  );
  rejects(
    () =>
      measureText(
        { kind: "rich", width: 30, paragraphs: [paragraph("А", { align: "left" })] },
        { resources: { Demo: overhang } },
      ),
    "FONT_INK",
  );
});

test("actual rich PDF passes qpdf, extracts mixed fonts in order and rasterizes colored ink inside the envelope", async () => {
  const options = { resources: { Demo: await fixtureFont() } };
  const paragraphs = [
    paragraph("", {
      runs: [
        { text: "RED", style: { font: "Helvetica", fontSize: 24, color: [1, 0, 0] } },
        { text: " Привет", style: { color: [0, 0, 1] } },
      ],
    }),
  ];
  const measured = measureText({ kind: "rich", width: 300, paragraphs }, options);
  const node: RichTextNode = {
    type: "richText",
    x: 20,
    y: 20,
    width: 300,
    height: measured.consumedHeight,
    paragraphs,
  };
  const document = { version: 1, pages: [{ width: 340, height: 100, children: [node] }] } as const;
  const bytes = render(document, options);
  assert.deepEqual(
    render(
      lower(
        h("document", {
          version: 1,
          children: h("page", {
            width: 340,
            height: 100,
            children: h("richText", { x: node.x, y: node.y, width: node.width, height: node.height, paragraphs }),
          }),
        }),
        options,
      ),
      options,
    ),
    bytes,
  );
  await inspect(bytes);
});

async function inspect(bytes: Uint8Array): Promise<void> {
  const directory = new URL("../../artifacts/measurement/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const path = new URL("rich.pdf", directory).pathname;
  await writeFile(path, bytes);
  execFileSync("qpdf", ["--check", path]);
  assert.match(execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" }), /RED Привет/);
  const prefix = new URL("rich", directory).pathname;
  execFileSync("pdftoppm", ["-r", "72", "-singlefile", path, prefix]);
  const ppm = await readFile(`${prefix}.ppm`);
  const start = ppm.indexOf(Buffer.from("\n255\n")) + 5;
  assert.ok(start > 4);
  const rgb = ppm.subarray(start);
  let red = 0,
    blue = 0;
  for (let i = 0; i < rgb.length; i += 3) {
    const r = rgb[i] ?? 255,
      g = rgb[i + 1] ?? 255,
      b = rgb[i + 2] ?? 255;
    if (r > 150 && g < 100 && b < 100) red++;
    if (b > 150 && g < 100 && r < 100) blue++;
    if (Math.min(r, g, b) < 100) assert.ok(Math.floor(i / 3 / 340) >= 20 && Math.floor(i / 3 / 340) < 50);
  }
  assert.ok(red > 50 && blue > 50);
}
