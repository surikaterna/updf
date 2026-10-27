import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { h } from "@updf/core/vdom";
import { Document, Flow, layout } from "@updf/layout";
import { textFlow, floatable } from "@updf/text-flow";
import { Path, pathShapes } from "@updf/text-flow/path";
import { Source } from "@updf/text-flow/sources";

const require = createRequire(import.meta.url);
const geometry = require("@updf/geometry") as typeof import("@updf/geometry");
const d = "M0 0H96V96H0Z";
const region = { pageSize: { width: 220, height: 260 }, margins: { top: 0, right: 0, bottom: 0, left: 0 } };
const FloatingPath = floatable(Path);
const options = { extensions: [textFlow({ handlers: [pathShapes()] })] };
test("one default Path normalization feeds painting and exclusion; independent overrides normalize independently", () => {
  const descriptor = Object.getOwnPropertyDescriptor(geometry, "parsePathData")!;
  const parse = geometry.parsePathData;
  let calls = 0;
  Object.defineProperty(geometry, "parsePathData", {
    configurable: true,
    value: (...args: Parameters<typeof parse>) => {
      calls++;
      return parse(...args);
    },
  });
  try {
    const document = (shape?: ReturnType<typeof Source.path>) =>
      h(Document, {
        children: h(Flow, {
          ...region,
          children: h(FloatingPath, {
            d,
            fill: "#3498db",
            style: { width: 96, height: 96, float: "left", ...(shape ? { shapeOutside: shape } : {}) },
          }),
        }),
      });
    layout(document(), options);
    assert.equal(calls, 1);
    layout(document(Source.path(d, { fillRule: "evenodd" })), options);
    assert.equal(calls, 3);
    calls = 0;
    const long = h(Document, {
      children: h(Flow, {
        ...region,
        children: h(Path, { d: `M0 0${" ".repeat(1000)}H96V96H0Z`, fill: "#000", style: { width: 96, height: 96 } }),
      }),
    });
    assert.throws(() => layout(long, { ...options, limits: { nodes: 500 } }), /Source work nodes/u);
    assert.equal(calls, 0, "source charge must precede geometry parsing");
  } finally {
    Object.defineProperty(geometry, "parsePathData", descriptor);
  }
});
