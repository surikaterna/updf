import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, type NodeDefinition, render } from "@updf/core";
import { useOperationCapability } from "@updf/core/resources";
import { createLayoutOperation } from "@updf/core/internal";
import { createExtensions, defineInlineAdapter, inline, paragraph, span } from "@updf/layout";
import { compositionOptions } from "../../../tests/fixtures/text-flow/options.js";
import { authorParagraph, normalizeBlocks } from "../dist/cjs/content-normalize.js";
import { measureParagraph } from "../dist/cjs/content-paragraph.js";
import { paragraphContinuation } from "../dist/cjs/content-inline-selection.js";

function flatten(nodes: Iterable<NodeDefinition>): NodeDefinition[] {
  return [...nodes].flatMap((node) => (node.type === "paintGroup" ? flatten(node.children) : [node]));
}
function fixture() {
  let preparations = 0;
  const adapter = defineInlineAdapter({
    name: "continuation-proof",
    validate: (value) => value,
    measure: () => {
      preparations++;
      return {
        advance: 8,
        ascent: 7,
        descent: 1,
        inkBounds: { empty: false as const, left: 0, right: 8, top: -7, bottom: 1 },
        nodes: [
          { type: "rect" as const, x: 0, y: 0, width: 8, height: 8, paint: { fill: [0, 1, 0] as const, stroke: null } },
        ],
      };
    },
  });
  const content = paragraph({
    whiteSpace: "preserve",
    children: [
      span({ style: { backgroundColor: [0.8, 0.8, 0.8], color: [1, 0, 0] }, children: ["AB ", inline(adapter, {})] }),
      span({ style: { fontSize: 14, color: [0, 0, 1] }, children: " CD EF GH IJ" }),
    ],
  });
  const options = compositionOptions();
  const operation = createLayoutOperation(options);
  const author = authorParagraph(normalizeBlocks(content, operation, "/body")[0]!)!;
  const extensions = createExtensions([adapter]);
  const selection = useOperationCapability(operation, options.capability);
  return { operation, author, extensions, selection, options, preparations: () => preparations };
}
test("normalized rich paragraph prefix/full-width tail reuses original reporting/background/emission/paint owners", () => {
  const f = fixture();
  const source = paragraphContinuation(f.author, f.operation, f.selection, 140, f.extensions);
  assert.equal(f.preparations(), 1);
  const request = { width: 32, maxHeight: 100 };
  assert.equal(source.select(source.start, { ...request, maxHeight: 0 }), undefined);
  const prefix = source.select(source.start, request)!;
  assert.ok(prefix.continuation);
  const repeat = source.select(source.start, request)!;
  assert.deepEqual(prefix.measured.lines, repeat.measured.lines);
  const tail = source.select(prefix.continuation, { width: 140, maxHeight: 100 })!;
  assert.equal(tail.continuation, undefined);
  const lines = [...prefix.measured.lines, ...tail.measured.lines];
  assert.equal(lines.flatMap((l) => l.fragments).filter((f) => f.role === "visual").length, 1);
  assert.equal(
    lines
      .flatMap((l) => l.fragments)
      .map((f) => (f.role === "text" ? f.text : ""))
      .join(""),
    "AB  CD EF GH IJ",
  );
  const nodes = [prefix, tail].flatMap(({ measured }, i) => [
    ...measured.paintLine(0, 0, i * 30, true),
    ...measured.paintLine(0, 0, i * 30),
  ]);
  assert.ok(flatten(nodes).some((n) => n.type === "rect"));
  assert.equal(flatten(nodes).filter((n) => n.type === "rect" && n.paint?.fill?.[1] === 1).length, 1);
  assert.ok(render({ version: 1, pages: [{ width: 160, height: 160, children: nodes }] }, f.options).length);
  assert.equal(f.preparations(), 1);
  f.operation.close();
});
test("uniform selection output is exactly shared; source diagnostics survive width rejection", () => {
  const f = fixture();
  const uniform = measureParagraph(f.author, 140, f.operation, f.extensions, f.author.path);
  const source = paragraphContinuation(f.author, f.operation, f.selection, 140, f.extensions);
  const selected = source.select(source.start, { width: 140, maxHeight: 100 })!;
  assert.deepEqual(selected.measured.lines, uniform.lines);
  assert.deepEqual(selected.measured.emissionCounts(0), uniform.emissionCounts(0));
  assert.deepEqual(selected.measured.paintLine(0, 3, 5, true), uniform.paintLine(0, 3, 5, true));
  assert.deepEqual(selected.measured.paintLine(0, 3, 5), uniform.paintLine(0, 3, 5));
  assert.throws(
    () => source.select(source.start, { width: 1, maxHeight: 100 }),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.path === f.author.sources[0],
  );
  assert.deepEqual(source.select(source.start, { width: 140, maxHeight: 100 })!.measured.lines, uniform.lines);
  const foreign = paragraphContinuation(f.author, f.operation, f.selection, 140, f.extensions);
  assert.throws(() => source.select(foreign.start, { width: 140, maxHeight: 100 }), DocumentError);
  f.operation.close();
});
