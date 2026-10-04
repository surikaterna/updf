import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { createContext, h, useContext } from "@updf/core/vdom";
import {
  block,
  createExtensions,
  document,
  flow,
  layout,
  measure,
  Paragraph,
  paragraph,
  pt,
  Span,
  span,
} from "@updf/layout";
import { badge, badgeAdapter } from "../../../apps/showcase/src/inline-badge.js";
import { fixtureFont } from "../../../tests/fixtures/fonts/font-fixture.js";

const near = (value: number, expected: number) =>
  assert.ok(Math.abs(value - expected) < 1e-12, `${value} != ${expected}`);
const height = (content: ReturnType<typeof paragraph>) => measure(content, { width: 200 }).lines[0]!.height;
test("#49-B public ratios resolve per nested participant; absolute inherited points stay absolute", () => {
  near(height(paragraph({ style: { fontSize: 12, lineHeight: 1.2 }, children: "A" })), 14.4);
  assert.equal(
    height(
      paragraph({
        style: { fontSize: 12, lineHeight: 1.2 },
        children: span({ style: { fontSize: 20 }, children: "A" }),
      }),
    ),
    24,
  );
  assert.equal(
    height(paragraph({ style: { fontSize: 20, lineHeight: pt(16) }, children: span({ children: "A" }) })),
    16,
  );
  near(
    height(
      paragraph({
        style: { fontSize: 12, lineHeight: pt(16) },
        children: span({ style: { fontSize: 20 }, children: "A" }),
      }),
    ),
    18.2,
  );
  assert.equal(
    height(
      paragraph({
        style: { fontSize: 12, lineHeight: 1.2 },
        children: span({ style: { fontSize: 20, lineHeight: "normal" }, children: "A" }),
      }),
    ),
    20,
  );
  assert.ok(Object.isFrozen(pt(16)));
});
test("#49-B normal is font-aware, empty lines use the paragraph strut, visuals grow the envelope", async () => {
  const font = await fixtureFont();
  const options = { resources: { Demo: font } };
  const natural =
    ((font.metadata.descriptor.ascent - font.metadata.descriptor.descent) * 12) / font.metadata.unitsPerEm;
  for (const children of ["", "A", "\n"]) {
    const measured = measure(paragraph({ style: { font: "Demo", fontSize: 12 }, children }), { width: 200 }, options);
    for (const line of measured.lines) near(line.height, natural);
  }
  const empty = measure(
    paragraph({
      style: { fontSize: 12, lineHeight: 1.2 },
      children: ["\n", span({ style: { fontSize: 20 }, children: "A\n" })],
    }),
    { width: 200 },
  );
  assert.deepEqual(
    empty.lines.map((line) => Math.round(line.height * 10) / 10),
    [14.4, 24, 14.4],
  );
  const mixed = measure(
    paragraph({ style: { fontSize: 12, lineHeight: pt(4) }, children: ["A", badge(24)] }),
    { width: 200 },
    { extensions: createExtensions([badgeAdapter]) },
  );
  assert.ok(mixed.lines[0]!.height >= 24);
});
test("#49-B composition is source-order object composition, sibling inheritance and explicit themes only", () => {
  const base = { fontSize: 12, lineHeight: 1.2, color: [0, 0, 1] as const };
  const accent = { fontSize: 20, color: [1, 0, 0] as const };
  const children = [
    span({ style: { ...base, ...accent }, children: "A" }),
    span({ style: { ...accent, ...base }, children: "B" }),
    "C",
  ];
  const content = paragraph({ style: base, children });
  const Theme = createContext(base);
  const Author = () => h(Paragraph, { style: useContext(Theme), children });
  const result = measure(h(Theme.Provider, { value: base, children: h(Author, {}) }), { width: 200 });
  const direct = measure(content, { width: 200 });
  assert.deepEqual(result.size, direct.size);
  assert.deepEqual(result.inkBounds, direct.inkBounds);
  assert.deepEqual(
    result.lines[0]?.fragments.map((fragment) => ({ ...fragment, source: null })),
    direct.lines[0]?.fragments.map((fragment) => ({ ...fragment, source: null })),
  );
  assert.deepEqual(
    result.lines[0]!.fragments.map((fragment) => (fragment.role === "text" ? fragment.style.fontSize : 0)),
    [20, 12, 12],
  );
  assert.equal(
    measure(block({ style: { background: [1, 1, 0] }, children: [paragraph({ children: "A" })] }), { width: 200 })
      .lines[0]!.height,
    10,
  );
});
function rejects(props: object, component = Paragraph, suffix = ""): void {
  const node = component === Span ? h(Paragraph, { children: h(component, props) }) : h(component, props);
  assert.throws(
    () => measure(node, { width: 200 }),
    (error: unknown) => error instanceof DocumentError && !!error.diagnostics[0]?.path.endsWith(suffix),
  );
}
test("#49-B obsolete props, wrong roles, unknown keys and explicit undefined reject at author sources", () => {
  for (const key of ["align", "lineHeight", "defaultStyle"]) rejects({ [key]: 12 }, Paragraph, `/${key}`);
  for (const key of ["fontFamily", "backgroundColor", "padding", "align", "whiteSpace"])
    rejects({ style: { [key]: "x" } }, Paragraph, `/style/${key}`);
  rejects({ style: { textAlign: "center" } }, Span, "/style/textAlign");
  rejects({ style: undefined }, Paragraph, "/style");
  for (const key of ["font", "fontSize", "color", "textAlign", "lineHeight"])
    rejects({ style: { [key]: undefined } }, Paragraph, `/style/${key}`);
  rejects({ style: { font: "Missing" } }, Paragraph, "/style/font");
  rejects({ style: { textAlign: "justify" } }, Paragraph, "/style/textAlign");
  for (const value of [0, -1, NaN, Infinity, -Infinity]) {
    rejects({ style: { fontSize: value } }, Paragraph, "/style/fontSize");
    rejects({ style: { lineHeight: value } }, Paragraph, "/style/lineHeight");
    rejects({ style: { lineHeight: { unit: "pt", value } } }, Paragraph, "/style/lineHeight/value");
    assert.throws(() => pt(value), DocumentError);
  }
  for (const value of [null, "16pt", { unit: "px", value: 16 }, { unit: "pt", value: 16, extra: true }])
    rejects({ style: { lineHeight: value } });
  rejects({ children: h(Span, { style: { lineHeight: undefined } } as never) }, Paragraph, "/style/lineHeight");
});
test("#49-B the same inline descriptor inherits raw values independently in each paragraph", () => {
  const children = span({ style: { fontSize: 20 }, children: "A" });
  assert.equal(height(paragraph({ style: { lineHeight: 1.2 }, children })), 24);
  near(height(paragraph({ style: { lineHeight: pt(16) }, children })), 18.75);
});
test("#49-B tight glyph ink remains outside the line box; page bounds remain strict", () => {
  const content = paragraph({ style: { fontSize: 12, lineHeight: pt(4) }, children: "A\nA" });
  const measured = measure(content, { width: 200 });
  assert.equal(measured.size.height, 8);
  assert.ok(!measured.inkBounds.empty && measured.inkBounds.top < 0 && measured.inkBounds.bottom > 8);
  const input = (margin: number) =>
    document({
      children: flow({
        pageSize: { width: 240, height: 100 },
        margins: { top: margin, right: 20, bottom: 20, left: 20 },
        children: content,
      }),
    });
  const result = layout(input(20));
  assert.ok(render(result.document).length);
  assert.throws(() => render(layout(input(0)).document), DocumentError);
});
