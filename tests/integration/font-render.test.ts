import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { render as coreRender, type DocumentDefinition, DocumentError, type OperationOptions } from "@updf/core";
import { type Component, h, lower } from "@updf/core/vdom";
import { createPreparedFont } from "@updf/fonts";
import { cmrFixture, createCmrDocument } from "../../apps/cmr/src/cmr.js";
import { measure } from "../../packages/core/dist/cjs/core/measure.js";
import { operation } from "../../packages/core/dist/cjs/core/operation.js";
import { fixtureFont, fontDocument, fontInput, fontParagraph, fontText } from "../fixtures/fonts/font-fixture.js";
import { fontOptions } from "../fixtures/fonts/font-options.js";

const render = (document: DocumentDefinition, options: OperationOptions = {}) =>
  coreRender(document, fontOptions(options));

async function inspect(
  bytes: Uint8Array,
  check: (path: string, directory: string) => void | Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "prepared-font-"));
  try {
    const path = join(directory, "font.pdf");
    await writeFile(path, bytes);
    execFileSync("qpdf", ["--check", path]);
    await check(path, directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("real full TrueType embedding extracts Cyrillic and Latin, mixed fonts and multiple pages", async () => {
  const font = await fixtureFont();
  const other = await fixtureFont();
  const page = fontDocument([
    fontText("Привет, мир!\nLatin ABC"),
    fontText("Helvetica ASCII", { paragraphs: [fontParagraph("Helvetica ASCII", "Helvetica")], y: 150 }),
    fontText("Другой шрифт", { paragraphs: [fontParagraph("Другой шрифт", "Other")], y: 200 }),
  ]).pages[0];
  assert.ok(page);
  const document = { version: 1, pages: [page, page] } as const;
  const options = { resources: { Demo: font, Other: other } };
  const bytes = render(document, options);
  assert.deepEqual(render(document, options), bytes);
  await inspect(bytes, (path) => {
    const fonts = execFileSync("pdffonts", [path], { encoding: "utf8" });
    assert.equal((fonts.match(/LiberationSans\s+CID TrueType\s+Identity-H\s+yes\s+no\s+yes/g) ?? []).length, 2);
    const extracted = execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8" });
    for (const text of ["Привет, мир!", "Latin ABC", "Helvetica ASCII", "Другой шрифт"])
      assert.equal(extracted.split(text).length - 1, 2);
  });
});

test("independent byte xref/stream offsets and extracted embedded program retain source hash", async () => {
  const bytes = render(fontDocument([fontText("Проверка")]), { resources: { Demo: await fixtureFont() } });
  const raw = Buffer.from(bytes).toString("latin1");
  const start = raw.match(/startxref\n(\d+)/);
  assert.ok(start);
  assert.equal(raw.slice(Number(start[1]), Number(start[1]) + 4), "xref");
  [...raw.matchAll(/^(\d{10}) 00000 n /gm)].forEach((entry, i) => {
    assert.ok(raw.slice(Number(entry[1])).startsWith(`${i + 1} 0 obj\n`));
  });
  for (const match of raw.matchAll(/<< \/Length (\d+)(?: \/Length1 (\d+))? >>\nstream\n/g)) {
    const begin = match.index + match[0].length;
    const length = Number(match[1]);
    assert.equal(raw.slice(begin + length, begin + length + 9), "endstream");
    if (match[2]) {
      assert.equal(
        createHash("sha256")
          .update(bytes.subarray(begin, begin + length))
          .digest("hex"),
        "76d04c18ea243f426b7de1f3ad208e927008f961dc5945e5aad352d0dfde8ee8",
      );
    }
  }
});

test("codepoint CIDs stay distinct for a shared GID and supplementary ToUnicode uses UTF16BE", async () => {
  const input = await fontInput();
  const reference = createPreparedFont(input);
  const glyph = reference.metadata.glyphs.find((item) => item.codePoint === 65);
  assert.ok(glyph);
  const alias = createPreparedFont({ ...input, glyphs: [glyph, { ...glyph, codePoint: 0x1df00 }] });
  const text = "A\u{1df00}";
  const bytes = render(fontDocument([fontText(text)]), { resources: { Demo: alias } });
  const raw = Buffer.from(bytes).toString("latin1");
  assert.ok(raw.includes("<00010002> Tj"));
  assert.ok(raw.includes("<0001> <0041>") && raw.includes("<0002> <d837df00>"));
  await inspect(bytes, (path) =>
    assert.equal(execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" }).trim(), text),
  );
});

test("selected-font advance widths and wrapping match independent Poppler bbox alignment", async () => {
  const font = await fixtureFont();
  const options = { resources: { Demo: font } };
  const node = fontText("ABC", { x: 100, width: 100, paragraphs: [fontParagraph("ABC", "Demo", 10, 12, "right")] });
  const expected =
    ("ABC".split("").reduce((sum, char) => {
      const glyph = font.metadata.glyphs.find((item) => item.codePoint === char.codePointAt(0));
      assert.ok(glyph);
      return sum + glyph.advance;
    }, 0) /
      font.metadata.unitsPerEm) *
    10;
  await inspect(render(fontDocument([node]), options), (path) => {
    const bbox = execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" });
    const match = bbox.match(/<word xMin="([^"]+)"[^>]*xMax="([^"]+)"[^>]*>ABC<\/word>/);
    assert.ok(match);
    assert.ok(Math.abs(Number(match[1]) - (200 - expected)) < 1e-5);
    assert.ok(Math.abs(Number(match[2]) - 200) < 1e-5);
  });
  const plan = measure(
    fontDocument([
      fontText("ABC ABC", { width: expected + 4, paragraphs: [fontParagraph("ABC ABC", "Demo", 10, 12)] }),
    ]),
    operation(fontOptions(options)).fonts,
  );
  const measured = plan[0]?.children[0];
  assert.ok(measured?.type === "richText");
  assert.deepEqual(
    measured.fragments.map((fragment) => fragment.text),
    ["ABC ", "ABC"],
  );
});

test("actual selected glyph bounds control exact-fit multiline ascent/descent and overhang rejection", async () => {
  const font = await fixtureFont();
  const options = { resources: { Demo: font } };
  const bar = font.metadata.glyphs.find((item) => item.codePoint === 124);
  assert.ok(bar);
  const ink = ((bar.bounds[3] - bar.bounds[1]) / font.metadata.unitsPerEm) * 100;
  const node = fontText("|\n|", { paragraphs: [fontParagraph("|\n|", "Demo", 100, 100)], height: 200 });
  assert.ok(ink <= 100 && render(fontDocument([node]), options).length);
  assert.throws(() => render(fontDocument([fontText("j")]), options), DocumentError);
  const input = await fontInput();
  const tall = createPreparedFont({ ...input, glyphs: [{ ...bar, bounds: [0, -600, 100, 1800] }] });
  assert.throws(
    () =>
      render(fontDocument([fontText("|", { paragraphs: [fontParagraph("|", "Demo", 100, 100)], height: 100 })]), {
        resources: { Demo: tall },
      }),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "FONT_INK",
  );
});

test("real embedded-font raster retains top-edge ink and contains tight multiline boxes", async () => {
  const font = await fixtureFont();
  const document = fontDocument([
    fontText("|", { x: 20, y: 0, width: 50, height: 100, paragraphs: [fontParagraph("|", "Demo", 100, 100)] }),
    fontText("|\n|", { x: 100, y: 50, width: 50, height: 200, paragraphs: [fontParagraph("|\n|", "Demo", 100, 100)] }),
  ]);
  await inspect(render(document, { resources: { Demo: font } }), async (path, directory) => {
    const prefix = join(directory, "ink");
    execFileSync("pdftoppm", ["-r", "144", "-gray", "-singlefile", path, prefix]);
    const bytes = await readFile(`${prefix}.pgm`);
    const header = bytes.toString("ascii", 0, 100).match(/^P5\s+(\d+)\s+(\d+)\s+255\s/);
    assert.ok(header);
    const pixels = bytes.subarray(header[0].length);
    const width = Number(header[1]);
    const rows = (left: number, right: number): number[] =>
      Array.from({ length: Number(header[2]) }, (_, y) => y).filter((y) =>
        pixels.subarray(y * width + left, y * width + right).some((pixel) => pixel < 128),
      );
    const top = rows(40, 140);
    const multi = rows(200, 300);
    assert.ok(top.length > 0 && top.every((y) => y >= 0 && y < 200));
    assert.ok(
      multi.every((y) => y >= 100 && y < 500),
      `top=${top[0]}..${top.at(-1)}, multi=${multi[0]}..${multi.at(-1)}`,
    );
    assert.deepEqual(multi, [...top.map((y) => y + 100), ...top.map((y) => y + 300)]);
  });
});

test("resource-aware VDOM validates Unicode and gives components only immutable id/kind metadata", async () => {
  const resources = { Demo: await fixtureFont() };
  const Text: Component<object> = (_props, context) => {
    assert.deepEqual(context.resources, [
      { id: "Helvetica", kind: "resource" },
      { id: "Demo", kind: "resource" },
    ]);
    assert.ok(Object.isFrozen(context.resources[0]) && !("bytes" in (context.resources[0] ?? {})));
    const { type: _type, ...props } = fontText("Москва");
    return h("richText", props);
  };
  const node = h("document", { version: 1, children: h("page", { width: 595, height: 842, children: h(Text, {}) }) });
  const ast = lower(node, fontOptions({ resources }));
  assert.deepEqual(render(ast, { resources }), render(fontDocument([fontText("Москва")]), { resources }));
});

test("unused prepared resources retain the canonical rich CMR bytes", async () => {
  const document = createCmrDocument(cmrFixture);
  const before = render(document);
  assert.deepEqual(render(document, { resources: { Unused: await fixtureFont() } }), before);
  assert.equal(
    createHash("sha256").update(before).digest("hex"),
    "cb826a04f161a18e472d9ed70aa9342be20356a91527eb90d1f46cfe1fc5a7bb",
  );
});
