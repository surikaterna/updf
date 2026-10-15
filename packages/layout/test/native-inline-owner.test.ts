import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createDrawingLayoutOperation } from "@updf/core/internal-drawing";
import { createHelvetica } from "@updf/fonts";
import { createExtensions, defineInlineAdapter, inline, nativeInline } from "@updf/layout";
import { textOptions } from "../../../tests/fixtures/text-options.js";
import { OutputBudget } from "../dist/cjs/budget.js";
import { prepareVisual } from "../dist/cjs/inline-adapters.js";

const style = { font: "Helvetica", fontSize: 10, color: [0, 0, 0] as const };
const nodes = [
  { type: "rect" as const, x: 0, y: 0, width: 4, height: 8, paint: { fill: [1, 0, 0] as const, stroke: null } },
];
function rejection(callback: () => unknown, code: string, path?: string): void {
  assert.throws(
    callback,
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === code &&
      (!path || error.diagnostics[0].path === path),
  );
}

test("both source kinds use one exact width/style/operation cache and rebase cached source paths", () => {
  const operation = createDrawingLayoutOperation(textOptions({}));
  let calls = 0;
  const counted = {
    ...operation,
    nativeInk: (value: Parameters<typeof operation.nativeInk>[0]) => {
      calls++;
      return operation.nativeInk(value);
    },
  };
  const native = nativeInline({ advance: 4, ascent: 6, descent: 2, nodes });
  try {
    const first = prepareVisual(native, 20, style, counted, undefined, "/first");
    assert.deepEqual(first.measurement.inkBounds, { empty: false, left: 0, right: 4, top: -6, bottom: 2 });
    assert.ok(Object.isFrozen(first.measurement) && Object.isFrozen(first.measurement.nodes));
    assert.equal(prepareVisual(native, 20, { ...style }, counted, undefined, "/second").measurement, first.measurement);
    assert.equal(prepareVisual(native, 20, style, counted, undefined, "/second").path, "/second");
    assert.equal(calls, 1);
    prepareVisual(native, 20 + Number.EPSILON * 16, style, counted, undefined, "/width");
    prepareVisual(native, 20, { ...style, fontSize: 11 }, counted, undefined, "/style");
    assert.equal(calls, 3);
    const other = createDrawingLayoutOperation(textOptions({}));
    try {
      assert.notEqual(prepareVisual(native, 20, style, other, undefined, "/other").measurement, first.measurement);
    } finally {
      other.close();
    }
  } finally {
    operation.close();
  }
});

test("failed native validation does not adopt capture, cached reuse is free but each emission is charged", () => {
  const operation = createDrawingLayoutOperation(textOptions({ limits: { nodes: 2 } }));
  const bad = nativeInline({ advance: 3, ascent: 8, nodes });
  const good = nativeInline({ advance: 4, ascent: 8, nodes });
  try {
    rejection(() => prepareVisual(bad, 20, style, operation, undefined, "/bad"), "BOUNDS");
    const result = prepareVisual(good, 20, style, operation, undefined, "/good");
    assert.equal(prepareVisual(good, 20, style, operation, undefined, "/again").measurement, result.measurement);
    const budget = new OutputBudget(operation.policy);
    budget.apply(result.emissionCounts, "/placement/0");
    budget.apply(result.emissionCounts, "/placement/1");
    rejection(() => budget.apply(result.emissionCounts, "/placement/2"), "LIMIT", "/placement/2");
    prepareVisual(nativeInline({ advance: 4, ascent: 8, nodes }), 20, style, operation, undefined, "/second");
    rejection(
      () => prepareVisual(nativeInline({ advance: 4, ascent: 8, nodes }), 20, style, operation, undefined, "/new"),
      "LIMIT",
      "/new",
    );
  } finally {
    operation.close();
  }
});

test("adapter installation, exact cache keys, declared ink and retained context lifetime remain enforced", () => {
  const operation = createDrawingLayoutOperation(textOptions({}));
  const calls: number[] = [];
  let retained: (() => unknown) | undefined;
  const adapter = defineInlineAdapter({
    name: "native.owner-adapter",
    validate: (value) => value,
    measure(_props, context) {
      calls.push(context.width);
      retained = () => context.measureNative(nodes, { width: 4, height: 8 });
      return {
        advance: context.width,
        ascent: context.style.fontSize,
        descent: 0,
        nodes: [],
        inkBounds: { empty: true as const },
      };
    },
  });
  const descriptor = inline(adapter, {}),
    extensions = createExtensions([adapter]);
  try {
    rejection(() => prepareVisual(descriptor, 20, style, operation, undefined, "/uninstalled"), "KEY", "/uninstalled");
    assert.equal(prepareVisual(descriptor, 20, style, operation, extensions, "/a").measurement.advance, 20);
    assert.equal(prepareVisual(descriptor, 20, style, operation, extensions, "/b").path, "/b");
    const next = 20 + Number.EPSILON * 16;
    assert.equal(prepareVisual(descriptor, next, style, operation, extensions, "/c").measurement.advance, next);
    assert.equal(
      prepareVisual(descriptor, 20, { ...style, fontSize: 11 }, operation, extensions, "/d").measurement.ascent,
      11,
    );
    assert.deepEqual(calls, [20, next, 20]);
    rejection(
      () => prepareVisual(descriptor, 20, style, operation, undefined, "/cached-uninstalled"),
      "KEY",
      "/cached-uninstalled",
    );
  } finally {
    operation.close();
  }
  rejection(() => retained?.(), "MEASUREMENT_CONTEXT");
});

test("adapter underdeclared ink and callback errors retain source diagnostics and failed capture is discarded", () => {
  const operation = createDrawingLayoutOperation(textOptions({ limits: { nodes: 2 } }));
  const adapter = defineInlineAdapter({
    name: "native.bad-ink",
    validate: (value) => value,
    measure: () => ({ advance: 4, ascent: 8, descent: 0, nodes, inkBounds: { empty: true as const } }),
  });
  const thrown = defineInlineAdapter<unknown>({
    name: "native.thrown",
    validate: () => {
      throw Error("original");
    },
    measure: () => {
      throw Error("unreachable");
    },
  });
  try {
    for (let i = 0; i < 3; i++)
      rejection(
        () => prepareVisual(inline(adapter, {}), 20, style, operation, createExtensions([adapter]), "/ink"),
        "GEOMETRY",
        "/ink/inkBounds",
      );
    rejection(
      () => prepareVisual(inline(thrown, {}), 20, style, operation, createExtensions([thrown]), "/callback"),
      "TYPE",
      "/callback",
    );
    assert.equal(
      prepareVisual(nativeInline({ advance: 4, ascent: 8, nodes }), 20, style, operation, undefined, "/valid")
        .measurement.nodes.length,
      1,
    );
  } finally {
    operation.close();
  }
});

test("native resources are revalidated per operation and failed resource capture cannot exhaust native nodes", () => {
  const text = nativeInline({
    advance: 4,
    ascent: 8,
    nodes: [
      {
        type: "richText",
        x: 0,
        y: 0,
        width: 4,
        height: 8,
        paragraphs: [
          {
            runs: [{ text: "A" }],
            defaultStyle: { font: "Extra", fontSize: 1, color: [0, 0, 0] },
            lineHeight: 1,
            align: "left",
            whiteSpace: "preserve",
            breakLongWords: "error",
          },
        ],
      },
    ],
  });
  const first = createDrawingLayoutOperation(textOptions({ resources: { Extra: createHelvetica() } }));
  try {
    assert.equal(prepareVisual(text, 20, style, first, undefined, "/bound").measurement.nodes.length, 1);
  } finally {
    first.close();
  }
  const second = createDrawingLayoutOperation(textOptions({ limits: { nodes: 8 } }));
  try {
    for (let i = 0; i < 9; i++)
      rejection(() => prepareVisual(text, 20, style, second, undefined, "/unbound"), "FONT_RESOURCE");
    assert.equal(
      prepareVisual(nativeInline({ advance: 4, ascent: 8, nodes }), 20, style, second, undefined, "/valid").measurement
        .nodes.length,
      1,
    );
  } finally {
    second.close();
  }
});
