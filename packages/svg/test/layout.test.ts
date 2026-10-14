import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { block, createExtensions, defineBlockAdapter, document, extension, flow, paragraph } from "@updf/layout";
import { table, tableExtension } from "@updf/tables";
import { layout, measure, textOptions } from "../../../tests/fixtures/text-options.js";
import { prepareSVG } from "@updf/svg";
import { compilePreparedSVG, prepareSVGTree, type PreparedSvg } from "@updf/svg/authoring";
import { jsx } from "@updf/svg/jsx-runtime";
import { svgAdapters, svgBlock, svgInline, type SvgSize } from "@updf/svg/layout";

const xml =
  '<svg width="40" height="30" viewBox="0 0 20 10"><rect x="2" y="1" width="16" height="8" fill="red"/></svg>';
const prepared = prepareSVG(xml);
const extensions = createExtensions(svgAdapters);
const margins = { top: 0, right: 0, bottom: 0, left: 0 };
function run(children: NonNullable<Parameters<typeof flow>[0]["children"]>, installed = extensions, height = 100) {
  return layout(
    document({ children: flow({ pageSize: { width: 100, height }, margins, extensions: installed, children }) }),
  );
}
function rejects(callback: () => unknown, code: string, path?: string) {
  assert.throws(
    callback,
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === code &&
      (path === undefined || error.diagnostics[0]?.path === path),
  );
}
function props(size: SvgSize) {
  return svgBlock(prepared, size).props as { width: number; height: number; nodes: readonly unknown[] };
}
test("viewport sizing uses explicit dimensions, then viewBox ratio, then intrinsic pair", () => {
  for (const [size, width, height] of [
    [{}, 40, 30],
    [{ width: 60 }, 60, 30],
    [{ height: 20 }, 40, 20],
    [{ width: 70, height: 80 }, 70, 80],
  ] as const) {
    const value = props(size);
    assert.equal(value.width, width);
    assert.equal(value.height, height);
    assert.deepEqual(value.nodes, [compilePreparedSVG(prepared, { x: 0, y: 0, w: width, h: height }).node]);
  }
  const intrinsic = prepareSVG('<svg width="40px" height="20"><rect width="10" height="10"/></svg>');
  assert.equal((svgBlock(intrinsic, { height: 10 }).props as { width: number }).width, 20);
  const noIntrinsic = prepareSVG('<svg viewBox="0 0 20 10"/>');
  rejects(() => svgBlock(noIntrinsic, {}), "SVG_GEOMETRY", "/SVG_VIEWPORT");
  assert.ok(svgBlock(noIntrinsic, { width: 10, height: 20 }));
  const partial = prepareSVG('<svg width="9" viewBox="0 0 20 10"/>');
  rejects(() => svgInline(partial, {}), "SVG_GEOMETRY", "/SVG_VIEWPORT");
  assert.equal((svgInline(partial, { width: 10 }).props as { height: number }).height, 5);
});
test("invalid sizing, derived overflow and malicious handles reject before getters", () => {
  for (const width of [0, -1, NaN, Infinity]) rejects(() => svgBlock(prepared, { width }), "GEOMETRY");
  rejects(() => svgInline(prepared, { width: undefined } as unknown as SvgSize), "TYPE");
  rejects(() => svgInline(prepared, { extra: 1 } as SvgSize), "KEY");
  let reads = 0;
  const getter = Object.defineProperty({}, "width", {
    enumerable: true,
    get() {
      reads++;
      return 10;
    },
  });
  rejects(() => svgBlock(prepared, getter), "TYPE");
  const fake = Object.defineProperty({}, "diagnostics", {
    get() {
      reads++;
      return [];
    },
  });
  rejects(() => svgInline(fake as PreparedSvg, {}), "SVG_GEOMETRY");
  assert.equal(reads, 0);
  const huge = prepareSVG('<svg viewBox="0 0 1000 1e308"/>');
  rejects(() => svgBlock(huge, { width: 1e308 }), "SVG_GEOMETRY", "/SVG_VIEWPORT");
});
test("helpers reject preparation warnings with original source provenance", () => {
  const warning = prepareSVG(
    '<svg viewBox="0 0 10 10"><rect width="2" height="2" style="stroke:&apos;none&apos;"/></svg>',
  );
  assert.ok(warning.diagnostics.length);
  for (const helper of [svgBlock, svgInline])
    rejects(() => helper(warning, { width: 10 }), "SVG_STYLE", warning.diagnostics[0]?.path);
});
test("XML and direct structured handles give identical block and inline native output", () => {
  const structured = prepareSVGTree(
    jsx("svg", {
      width: 40,
      height: 30,
      viewBox: "0 0 20 10",
      children: jsx("rect", { x: 2, y: 1, width: 16, height: 8, fill: "red" }),
    }),
  );
  const children = (graphic: PreparedSvg) => [
    svgBlock(graphic, { width: 40 }),
    paragraph({ children: svgInline(graphic, { width: 20 }) }),
  ];
  const a = run(children(prepared));
  const b = run(children(structured));
  assert.deepEqual(a.document, b.document);
  assert.deepEqual(render(a.document), render(b.document));
  assert.ok(Object.isFrozen(svgAdapters));
  assert.equal(svgAdapters[0].name, "svgBlock");
  assert.equal(svgAdapters[1].name, "svgInline");
});
test("baseline-bottom inline metrics and clipping preserve meet/slice/none semantics", () => {
  const result = measure(
    paragraph({ children: svgInline(prepared, { width: 40, height: 20 }) }),
    { width: 100 },
    { extensions },
  );
  assert.equal(result.lines[0]?.baseline, 20);
  assert.equal(result.lines[0]?.fragments[0]?.advance, 40);
  for (const preserve of ["xMidYMid meet", "xMidYMid slice", "none"]) {
    const graphic = prepareSVG(
      `<svg viewBox="0 0 20 10" preserveAspectRatio="${preserve}"><rect width="20" height="10"/></svg>`,
    );
    assert.deepEqual((svgBlock(graphic, { width: 10, height: 30 }).props as { nodes: unknown }).nodes, [
      compilePreparedSVG(graphic, { x: 0, y: 0, w: 10, h: 30 }).node,
    ]);
  }
});
test("capabilities are local, exact identities, and fixed oversized SVG never silently shrinks", () => {
  const content = svgBlock(prepared, {});
  rejects(() => run(content, createExtensions([])), "KEY");
  const foreign = defineBlockAdapter({
    name: "svgBlock",
    validate: (p) => p,
    measure: () => {
      throw new Error("foreign");
    },
  });
  rejects(() => run(content, createExtensions([foreign])), "KEY");
  rejects(() => createExtensions([...svgAdapters, svgAdapters[0]]), "KEY");
  rejects(() => run(content, extensions, 20), "LAYOUT_OVERSIZED");
  rejects(() => run(svgBlock(prepared, { width: 101 })), "GEOMETRY");
});
test("manual adapter props retain native validation and source/output budgets", () => {
  const raw = { width: 10, height: 10, nodes: [{ type: "foreign" }] };
  rejects(() => run(extension(svgAdapters[0], raw as never)), "TYPE");
  rejects(() => run(extension(svgAdapters[0], { ...props({}), extra: 1 } as never)), "KEY");
  const content = document({
    children: flow({
      pageSize: { width: 100, height: 100 },
      margins,
      extensions,
      children: [svgBlock(prepared, {}), svgBlock(prepared, {})],
    }),
  });
  rejects(() => layout(content, { limits: { nodes: 2 }, profile: "service" }), "LIMIT");
  rejects(() => render(layout(content).document, { limits: { outputBytes: 100 }, profile: "service" }), "LIMIT");
});
test("styled table/block/paragraph composition preserves explicit text resources", () => {
  const installed = createExtensions([...svgAdapters, tableExtension]);
  const children = table({
    columns: [{ width: 100 }],
    style: { padding: 2, fontSize: 8 },
    body: [
      {
        cells: [
          {
            children: block({
              style: { padding: 1 },
              children: [
                svgBlock(prepared, { width: 20 }),
                paragraph({ children: ["Badge ", svgInline(prepared, { width: 12 })] }),
              ],
            }),
          },
        ],
      },
    ],
  });
  const result = run(children, installed);
  assert.ok(render(result.document, textOptions({})).length > 0);
});
