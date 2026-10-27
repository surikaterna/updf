import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core/internal";
import { h } from "@updf/core/vdom";
import { Block, Document, Flow, layout } from "@updf/layout";
import { floatable, textFlow } from "@updf/text-flow";
import { Path, pathShapes } from "@updf/text-flow/path";
import { Source } from "@updf/text-flow/sources";
import { shapeSyntax } from "@updf/text-flow/syntax";
import { captureHandlers, defineHandler } from "../src/handlers.js";
import { captureSource } from "../src/source-capture.js";

const d = "M0 0H20V20H0Z";
const style = { width: 20, height: 20 };
const FloatingBlock = floatable(Block);
const document = (child: unknown) =>
  h(Document, {
    children: h(Flow, {
      pageSize: { width: 220, height: 300 },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      children: child,
    } as never),
  });
const shape = (shapeOutside: unknown) =>
  document(h(FloatingBlock, { style: { ...style, float: "left", shapeOutside } } as never));
function inherited<T>(key: string, descriptor: PropertyDescriptor, run: () => T): T {
  const before = Object.getOwnPropertyDescriptor(Object.prototype, key);
  Object.defineProperty(Object.prototype, key, { configurable: true, ...descriptor });
  try {
    return run();
  } finally {
    if (before) Object.defineProperty(Object.prototype, key, before);
    else Reflect.deleteProperty(Object.prototype, key);
  }
}
function sourced(run: () => unknown, suffix: string, code?: string) {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof DocumentError);
    assert.ok(error.diagnostics[0]!.path.endsWith(suffix), error.message);
    if (code) assert.equal(error.diagnostics[0]!.code, code);
    return true;
  });
}
test("source tags and payloads must be own data, never inherited values or getters", () => {
  for (const [key, input, value] of [
    ["kind", {}, "path"],
    ["d", { kind: "path" }, d],
    ["src", { kind: "url" }, "https://example.invalid/no-io"],
    ["points", { kind: "polygon" }, [0, 0, 20, 0, 0, 20]],
  ] as const) {
    let calls = 0;
    for (const descriptor of [{ value }, { get: () => (calls++, value) }])
      inherited(key, descriptor, () => sourced(() => captureSource(input, "/shape"), "/shape", "VALUE"));
    assert.equal(calls, 0);
  }
});
test("missing source kind rejects even when all source fields exist on Object.prototype", () => {
  inherited("kind", { value: "path" }, () =>
    inherited("d", { value: d }, () =>
      inherited("fillRule", { value: "evenodd" }, () => sourced(() => captureSource({}, "/shape"), "/shape", "VALUE")),
    ),
  );
});
test("source fill rule defaults only on own omission and pure options never inherit it", () => {
  let calls = 0;
  inherited("fillRule", { get: () => (calls++, "evenodd") }, () => {
    assert.equal((captureSource({ kind: "path", d }, "/shape") as { fillRule: string }).fillRule, "nonzero");
    assert.equal(Source.path(d, {}).fillRule, "nonzero");
    for (const fillRule of [undefined, null])
      sourced(() => captureSource({ kind: "path", d, fillRule }, "/shape"), "/shape", "VALUE");
  });
  assert.equal(calls, 0);
});
test("source validation rejects hostile records before getters and accepts null-prototype data", () => {
  let calls = 0;
  const accessor = Object.defineProperty({}, "kind", { enumerable: true, get: () => (calls++, "path") });
  for (const input of [null, undefined, [], Object.create({ kind: "path", d }), accessor, { unknown: 1 }])
    sourced(
      () => captureSource(input, "/shape"),
      input === accessor ? "/kind" : input && "unknown" in input ? "/unknown" : "/shape",
    );
  assert.equal(calls, 0);
  const input = Object.fromEntries([
    ["kind", "path"],
    ["d", d],
  ]);
  Object.setPrototypeOf(input, null);
  assert.deepEqual(captureSource(input, "/shape"), Source.path(d));
});
test("Path required props and dimensions cannot be satisfied by inherited data or accessors", () => {
  for (const key of ["d", "fill", "style", "width", "height"]) {
    let calls = 0;
    const props: Record<string, unknown> = { d, fill: "#123456", style: { ...style } };
    const owner = key === "width" || key === "height" ? (props.style as Record<string, unknown>) : props;
    const value = owner[key];
    delete owner[key];
    for (const descriptor of [{ value }, { get: () => (calls++, value) }])
      inherited(key, descriptor, () =>
        sourced(
          () => layout(document(h(Path, props as never)), { extensions: [textFlow({ handlers: [pathShapes()] })] }),
          `/${key}`,
        ),
      );
    assert.equal(calls, 0);
  }
});
test("Path optional fill rule and float metadata never read inherited getters", () => {
  let calls = 0;
  inherited("fillRule", { get: () => (calls++, "evenodd") }, () =>
    inherited("shapeOutside", { get: () => (calls++, Source.path("not valid")) }, () => {
      const result = layout(document(h(Path, { d, fill: "#123456", style })), {
        extensions: [textFlow({ handlers: [pathShapes()] })],
      });
      assert.equal(result.pageCount, 1);
    }),
  );
  assert.equal(calls, 0);
});
test("all captured handler configs are frozen null-prototype records", () => {
  for (const config of [
    captureHandlers(undefined, false),
    captureHandlers({}, true),
    captureHandlers({ handlers: [] }, true),
  ]) {
    assert.equal(Object.getPrototypeOf(config), null);
    assert.ok(Object.isFrozen(config));
  }
});
test("inherited handler functions or getters cannot supply missing capabilities", () => {
  for (const key of ["geometry", "syntax", "visual"]) {
    let calls = 0;
    const callback = () => {
      calls++;
      throw new Error("inherited callback executed");
    };
    for (const descriptor of [{ value: callback }, { get: () => (calls++, callback) }])
      inherited(key, descriptor, () => {
        for (const extension of [textFlow(), textFlow({}), textFlow({ handlers: [] })]) {
          sourced(
            () => layout(shape(Source.path("not valid")), { extensions: [extension] }),
            "/shapeOutside",
            "MEASUREMENT_CONTEXT",
          );
          sourced(
            () => layout(shape("path('not valid')"), { extensions: [extension] }),
            "/shapeOutside",
            "MEASUREMENT_CONTEXT",
          );
        }
      });
    assert.equal(calls, 0);
  }
});
test("prototype slots neither create duplicate handlers nor authorize fake handles", () => {
  for (const key of ["geometry", "syntax", "visual"]) {
    let calls = 0;
    inherited(key, { get: () => (calls++, () => {}) }, () => {
      const owned = () => defineHandler({ kind: "syntax", resolve: () => Source.path(d) });
      const config = captureHandlers({ handlers: [owned()] }, true);
      assert.equal(Object.getPrototypeOf(config), null);
      sourced(() => captureHandlers({ handlers: [owned(), owned()] }, true), "/1", "VALUE");
      for (const fake of [{}, { ...owned() }, Object.create(owned())])
        sourced(() => captureHandlers({ handlers: [fake] }, true), "/0", "TYPE");
    });
    assert.equal(calls, 0);
  }
});
test("legitimate null-prototype authored sources and reused syntax data retain public behavior", () => {
  const input = { kind: "path", d, fillRule: "nonzero" };
  Object.setPrototypeOf(input, null);
  const options = { extensions: [textFlow({ handlers: [pathShapes(), shapeSyntax()] })] };
  const expected = layout(shape(Source.path(d)), options);
  assert.deepEqual(layout(shape(input), options), expected);
  assert.deepEqual(layout(shape(`path('${d}')`), options), expected);
});
