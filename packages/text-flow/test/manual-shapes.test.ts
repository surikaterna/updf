import assert from "node:assert/strict";
import test from "node:test";
import { h } from "@updf/core/vdom";
import { Block, Document, Flow, layout } from "@updf/layout";
import { textFlow, floatable } from "@updf/text-flow";
import { Path, pathShapes } from "@updf/text-flow/path";
import { Source } from "@updf/text-flow/sources";
import { shapeSyntax } from "@updf/text-flow/syntax";

const style = { width: 96, height: 96 };
const d = "M0 0H96V96H0Z";
const visual = () => h(Path, { d, fill: "#3498db", style });
const document = (children: ReturnType<typeof visual>[]) =>
  h(Document, {
    children: h(Flow, {
      pageSize: { width: 220, height: 300 },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      children,
    }),
  });
test("two ordinary Paths retain Blocks and need neither fonts nor a text provider", () => {
  const result = layout(document([visual(), visual()]), { extensions: [textFlow({ handlers: [pathShapes()] })] });
  assert.equal(result.pageCount, 1);
  assert.equal(result.placements.length, 2);
});
test("ordinary paths require the central installation and handler", () => {
  assert.throws(() => layout(document([visual()])), /extension/u);
  assert.throws(() => layout(document([visual()]), { extensions: [textFlow()] }), /pathShapes/u);
});
test("manual shape config rejects unknown identities and duplicates without executing accessors", () => {
  let calls = 0;
  const options = Object.defineProperty({}, "handlers", {
    get: () => {
      calls++;
      return [];
    },
  });
  for (const value of [
    undefined,
    null,
    options,
    { handlers: undefined },
    { handlers: [{}] },
    { handlers: [pathShapes(), pathShapes()] },
    { handlers: [shapeSyntax(), shapeSyntax()] },
  ])
    assert.throws(() => textFlow(value as never));
  assert.equal(calls, 0);
  const FloatingPath = floatable(Path);
  assert.ok(FloatingPath);
  assert.deepEqual(Source.path(d).fillRule, "nonzero");
});
const FloatingBlock = floatable(Block);
const shapeDocument = (shapeOutside: unknown) =>
  document([h(FloatingBlock, { style: { ...style, float: "left", shapeOutside } } as never)]);
const shapeOptions = { extensions: [textFlow({ handlers: [pathShapes(), shapeSyntax()] })] };
test("tagged and bounded syntax sources use the same closed geometry and native Block", () => {
  const polygon = [0, 0, 96, 0, 96, 96, 0, 96];
  const result = layout(shapeDocument(Source.path(d)), shapeOptions);
  for (const shape of [Source.polygon(polygon), `path('${d}')`, `path("${d}")`, "polygon(0 0, 96 0, 96 96, 0 96)"])
    assert.deepEqual(layout(shapeDocument(shape), shapeOptions), result);
});
test("obsolete grammar, units, nesting, nonfinite polygons and URL resolution reject without I/O", () => {
  for (const shape of [
    "rect",
    d,
    { d },
    undefined,
    null,
    "polygon(0px 0, 96 0, 0 96)",
    "polygon(0 0, 1e999 0, 0 96)",
    "polygon(0 0, 96 0)",
    "path(evenodd, 'M0 0Z')",
    "path('M0 0Z\")",
    "url('')",
    "path(path('x'))",
    "path('x\\q')",
    "url('x') trailing",
  ])
    assert.throws(() => layout(shapeDocument(shape), shapeOptions));
  for (const shape of [
    Source.url("https://example.invalid/image.png"),
    "url('https://example.invalid/image.png')",
    "url('a\\\'b')",
  ])
    assert.throws(() => layout(shapeDocument(shape), shapeOptions), /resolution\/extraction is not implemented/u);
  assert.throws(
    () => layout(shapeDocument(`path('${d}')`), { extensions: [textFlow({ handlers: [pathShapes()] })] }),
    /shapeSyntax/u,
  );
  assert.throws(() => layout(shapeDocument(Source.path(d)), { extensions: [textFlow()] }), /pathShapes/u);
});
test("handler configuration snapshots inputs and ordinary Paths remain barriers around the sole float", () => {
  const handlers = [pathShapes()];
  const extension = textFlow({ handlers });
  handlers.length = 0;
  const FloatingPath = floatable(Path);
  const floating = h(FloatingPath, { d, fill: "#3498db", style: { ...style, float: "left" } });
  assert.equal(layout(document([visual(), floating, visual()]), { extensions: [extension] }).placements.length, 3);
  assert.throws(
    () => layout(document([floating, visual(), floating]), { extensions: [extension] }),
    /Only one floating/u,
  );
  assert.throws(() => layout(document([visual()]), { extensions: [extension, extension] }), /Duplicate/u);
});
