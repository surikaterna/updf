import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { render } from "@updf/core";
import { type ComponentContext, h, lower } from "@updf/core/vdom";
import { compileSVG, prepareSVG, SVGError } from "@updf/svg";
import { compilePreparedSVG, createSVGComponent, prepareSVGTree, type SvgNode } from "@updf/svg/authoring";
import { jsxDEV } from "@updf/svg/jsx-dev-runtime";
import { Fragment, jsx, jsxs } from "@updf/svg/jsx-runtime";
import { document } from "../../../tests/fixtures/svg-authoring/document.js";
import { graphic } from "../../../tests/fixtures/svg-authoring/graphic.js";

const target = { x: 10, y: 15, w: 60, h: 40 };
const context: ComponentContext = {
  resources: [],
  measurement: {
    measureText: () => {
      throw new Error("SVG must not measure text");
    },
  },
};
const source =
  '<svg viewBox="0 0 20 10" transform="rotate(15)"><title>Structured graphic</title><g><rect x="2" y="3" width="5" height="4" fill="red" stroke-width="0.5"/><circle cx="12" cy="5" r="2" fill="blue"/></g></svg>';
function structured(inside: SvgNode, attrs: Record<string, string | number> = {}) {
  return jsx("svg", { viewBox: "0 0 20 10", ...attrs, children: inside });
}
function rejects(node: unknown): void {
  assert.throws(
    () => prepareSVGTree(node as SvgNode),
    (error: unknown) => {
      assert.ok(error instanceof SVGError);
      assert.ok(error.diagnostics[0]?.path.startsWith("/svg"));
      assert.equal(error.diagnostics[0]?.span, undefined);
      return true;
    },
  );
}
test("separate SVG/core TSX modules produce XML-identical native data and PDF bytes", () => {
  assert.deepEqual(compilePreparedSVG(graphic, target).node, compileSVG(source, target).node);
  const node = compileSVG(source, target).node;
  assert.deepEqual(
    render(lower(document)),
    render({ version: 1, pages: [{ width: 100, height: 80, children: [node] }] }),
  );
  const xmlPrepared = prepareSVG(source);
  for (const viewport of [target, { x: -7, y: 9, w: 31, h: 117 }, { x: 0, y: 0, w: 200, h: 30 }])
    assert.deepEqual(compilePreparedSVG(xmlPrepared, viewport), compileSVG(source, viewport));
  assert.ok(Object.isFrozen(graphic) && Object.isFrozen(graphic.diagnostics));
  assert.deepEqual([graphic.width, graphic.height], [20, 10]);
});
test("preparation owns snapshots and repeated placement reuses native child data", () => {
  const attrs = { value: "red" };
  const tree = {
    kind: "element",
    name: "svg",
    attrs: { viewBox: { value: "0 0 10 10" } },
    children: [
      {
        kind: "element",
        name: "rect",
        attrs: { width: { value: "4" }, height: { value: "5" }, fill: attrs },
        children: [],
      },
    ],
  } as const;
  const prepared = prepareSVGTree(tree);
  const first = compilePreparedSVG(prepared, target).node.children[0];
  attrs.value = "blue";
  const second = compilePreparedSVG(prepared, { ...target, w: 80 }).node.children[0];
  assert.ok(first?.type === "paintGroup" && second?.type === "paintGroup");
  assert.equal(first.children, second.children);
  const expected = compileSVG('<svg viewBox="0 0 10 10"><rect width="4" height="5" fill="red"/></svg>', target).node
    .children[0];
  assert.ok(expected?.type === "paintGroup");
  assert.deepEqual(first.children, expected.children);
  assert.throws(() => compilePreparedSVG({ ...prepared }, target), SVGError);
});
test("automatic/development runtimes support fragments, trusted sync components and ignore bookkeeping", () => {
  const child = jsx("rect", { width: 3, height: 4 });
  const automatic = jsxs("svg", {
    viewBox: "0 0 10 10",
    children: jsx(Fragment, { children: [null, false, child] }),
    key: "a",
  });
  const development = jsxDEV("svg", { viewBox: "0 0 10 10", children: child }, "b", false, { lineNumber: 99 }, null);
  assert.deepEqual(
    compilePreparedSVG(prepareSVGTree(automatic), target),
    compilePreparedSVG(prepareSVGTree(development), target),
  );
  let calls = 0;
  const component = () => {
    calls++;
    return child;
  };
  const prepared = prepareSVGTree(structured(jsx(component, {})));
  compilePreparedSVG(prepared, target);
  compilePreparedSVG(prepared, target);
  assert.equal(calls, 1);
});
test("geometry, transform, style and unsupported input fail during preparation without fake spans", () => {
  for (const child of [
    jsx("text", {}),
    jsx("image", {}),
    jsx("rect", { onclick: "x" }),
    jsx("rect", { width: -1 }),
    jsx("path", { d: "M0" }),
    jsx("g", { transform: "scale(0)" }),
    jsx("g", { style: "opacity:.5" }),
    jsx("g", { children: "visual text" }),
    jsx("defs", { children: jsx("path", { d: "M0 0" }) }),
  ])
    rejects(structured(child));
  rejects(structured(null, { preserveAspectRatio: "invalid" }));
  rejects(structured(42 as unknown as SvgNode));
  rejects(structured(Promise.resolve(null) as unknown as SvgNode));
  rejects(structured(jsx(() => Promise.resolve(null) as unknown as SvgNode, {})));
  for (const value of [NaN, Infinity, {}, () => "red"]) assert.throws(() => jsx("rect", { fill: value }), SVGError);
  assert.throws(() => prepareSVG('<svg viewBox="0 0 10 10"><path d="M0"/></svg>'), SVGError);
});
test("structured descriptors, cycles, depth, arrays and aggregate UTF-8 payload are bounded", () => {
  let getters = 0;
  const getter = {
    get kind() {
      getters++;
      return "element";
    },
  };
  rejects(getter);
  assert.equal(getters, 0);
  rejects(Object.assign(Object.create({ inherited: true }), { kind: "element", name: "svg", attrs: {}, children: [] }));
  rejects({
    kind: "element",
    name: "svg",
    attrs: { viewBox: { value: "0 0 10 10", span: { start: -1, end: 0 } } },
    children: [],
  });
  const cycle: unknown[] = [];
  cycle.push(cycle);
  rejects(cycle);
  rejects(structured(jsx(Fragment, { children: cycle })));
  rejects(new Array(20001));
  let nested: SvgNode = null;
  for (let i = 0; i < 66; i++) nested = jsx("g", { children: nested });
  rejects(structured(nested));
  rejects(
    structured([jsx("title", { children: "😀".repeat(140000) }), jsx("desc", { children: "😀".repeat(140000) })]),
  );
  rejects(structured(jsx("path", { d: `M0 0${" L1 1".repeat(4096)}` })));
});
test("warnings are frozen/observable and the factory authenticates before rejecting warnings", () => {
  const prepared = prepareSVGTree(structured(jsx("rect", { width: 3, height: 4, style: "stroke:'none'" })));
  const result = compilePreparedSVG(prepared, target);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0]?.span, undefined);
  assert.ok(Object.isFrozen(result.diagnostics[0]));
  assert.throws(
    () => createSVGComponent(prepared),
    (error: unknown) => {
      assert.ok(error instanceof SVGError);
      assert.equal(error.diagnostics[0]?.code, "SVG_STYLE");
      assert.equal(error.diagnostics[0]?.path, result.diagnostics[0]?.path);
      assert.equal(error.diagnostics[0]?.span, result.diagnostics[0]?.span);
      assert.match(error.message, /compilePreparedSVG/);
      return true;
    },
  );
  let getters = 0;
  const foreign = {
    get diagnostics() {
      getters++;
      return result.diagnostics;
    },
  };
  for (const value of [foreign, { ...prepared }])
    assert.throws(
      () => createSVGComponent(value as typeof prepared),
      (error: unknown) => {
        assert.ok(error instanceof SVGError);
        assert.equal(error.diagnostics[0]?.code, "SVG_GEOMETRY");
        assert.equal(error.diagnostics[0]?.path, "/graphic");
        return true;
      },
    );
  assert.equal(getters, 0);
});
test("Node ESM/CJS share prepared ownership and structured node identity", async () => {
  const require = createRequire(import.meta.url);
  const common = require("@updf/svg/authoring") as typeof import("@updf/svg/authoring");
  const runtime = require("@updf/svg/jsx-runtime") as typeof import("@updf/svg/jsx-runtime");
  const owned = common.prepareSVGTree(runtime.jsx("svg", { viewBox: "0 0 10 10" }));
  assert.deepEqual(compilePreparedSVG(owned, target), common.compilePreparedSVG(owned, target));
  assert.equal(common.compilePreparedSVG, compilePreparedSVG);
  assert.deepEqual(common.createSVGComponent(owned)(target, context), createSVGComponent(owned)(target, context));
  assert.deepEqual(Object.keys(common).sort(), [
    "SVGError",
    "compilePreparedSVG",
    "createSVGComponent",
    "prepareSVGTree",
  ]);
});
test("factory warning rejection preserves genuine XML span and does not compile a viewport", () => {
  const source = '<svg viewBox="0 0 10 10"><rect width="2" height="3" style="stroke:&apos;none&apos;"/></svg>';
  const graphic = prepareSVG(source);
  const warning = graphic.diagnostics[0];
  assert.ok(warning?.span);
  assert.equal(source.slice(warning.span.start, warning.span.end), "stroke:&apos;none&apos;");
  assert.throws(
    () => createSVGComponent(graphic),
    (error: unknown) => {
      assert.ok(error instanceof SVGError);
      assert.equal(error.diagnostics[0]?.code, "SVG_STYLE");
      assert.equal(error.diagnostics[0]?.path, warning.path);
      assert.deepEqual(error.diagnostics[0]?.span, warning.span);
      return true;
    },
  );
});
test("bound component reuses its handle and validates whole actual target props", () => {
  const Logo = createSVGComponent(graphic);
  for (const placement of [target, { x: 3, y: 7, w: 11, h: 90 }]) {
    const document = h("document", {
      version: 1,
      children: h("page", { width: 100, height: 100, children: h(Logo, placement) }),
    });
    assert.deepEqual(lower(document).pages[0]?.children, [compileSVG(source, placement).node]);
  }
  for (const invalid of [
    { ...target, extra: 1 },
    { ...target, w: 0 },
    { ...target, h: NaN },
  ])
    assert.throws(() => Logo(invalid, context), SVGError);
  let reads = 0;
  const accessor = {
    ...target,
    get x() {
      reads++;
      return 1;
    },
  };
  assert.throws(() => Logo(accessor, context), SVGError);
  assert.equal(reads, 0);
});
test("prepared root/nested transforms and paths are parsed once, never during placement", () => {
  const require = createRequire(import.meta.url);
  const transforms = require("../dist/cjs/transform.js") as typeof import("../src/transform.js");
  const shapes = require("../dist/cjs/shapes.js") as typeof import("../src/shapes.js");
  const originalTransform = transforms.transform;
  const originalGeometry = shapes.geometry;
  let transformCalls = 0;
  let geometryCalls = 0;
  transforms.transform = (...args) => {
    transformCalls++;
    return originalTransform(...args);
  };
  shapes.geometry = (...args) => {
    geometryCalls++;
    return originalGeometry(...args);
  };
  try {
    const xml =
      '<svg viewBox="0 0 20 10" transform="rotate(15) scale(2)"><svg x="2" y="1" width="8" height="6" viewBox="0 0 4 3" transform="translate(1 2)"><path d="M0 0 L4 3"/></svg></svg>';
    const placements = [target, { x: -5, y: 9, w: 15, h: 200 }];
    const expected = placements.map((placement) => compileSVG(xml, placement).node);
    transformCalls = geometryCalls = 0;
    const prepared = prepareSVG(xml);
    assert.equal(transformCalls, 3);
    assert.equal(geometryCalls, 1);
    transformCalls = geometryCalls = 0;
    const Logo = createSVGComponent(prepared);
    for (const [i, placement] of placements.entries()) {
      assert.deepEqual(compilePreparedSVG(prepared, placement).node, expected[i]);
      Logo(placement, context);
    }
    assert.equal(transformCalls, 0);
    assert.equal(geometryCalls, 0);
  } finally {
    transforms.transform = originalTransform;
    shapes.geometry = originalGeometry;
  }
});
