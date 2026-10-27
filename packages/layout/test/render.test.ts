import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render as renderDocument } from "@updf/core";
import { createOperationCapability, defineOperationExtension } from "@updf/core/internal";
import { definePrimitive, h, type LowerOptions } from "@updf/core/vdom";
import { Document, Page, document, page, layout } from "@updf/layout";
import { render } from "@updf/layout/render";

const rect = { x: 0, y: 0, width: 5, height: 5, paint: { fill: [1, 0, 0] as const, stroke: null } };
const content = document({ children: page({ size: { width: 20, height: 20 }, children: [] }) });

test("authored rendering maps only lowering options and delegates to existing layout and core", () => {
  const Badge = definePrimitive(
    "RenderBadge",
    (value): value is object => !!value && typeof value === "object",
    (_props, context) => {
      assert.deepEqual(context.resources, [{ id: "Descriptive", kind: "test" }]);
      return h("rect", rect);
    },
  );
  const authored = h(Document, { children: h(Page, { size: { width: 20, height: 20 }, children: h(Badge.Type, {}) }) });
  const options = { registry: [Badge.definition], resourceMetadata: [{ id: "Descriptive", kind: "test" }] };
  assert.deepEqual(render(authored, options), renderDocument(layout(authored, options).document));
  assert.deepEqual(render(content), renderDocument(layout(content).document));
  assert.throws(() => renderDocument(authored as never), DocumentError);
  assert.throws(() => render([authored, authored]), DocumentError);
});

test("malformed own options reject before user getters or component effects", () => {
  let calls = 0;
  const authored = h(() => {
    calls++;
    return content as never;
  }, {});
  const accessor = Object.defineProperty({}, "resources", {
    get() {
      calls++;
      return {};
    },
  });
  const hidden = Object.defineProperty({}, "unknown", { value: 1 });
  for (const options of [
    accessor,
    hidden,
    { unknown: true },
    { resources: undefined },
    { registry: undefined },
    { resourceMetadata: undefined },
    { extensions: undefined },
    { profile: undefined },
    { limits: undefined },
  ]) {
    assert.throws(() => render(authored, options as never), DocumentError);
  }
  assert.equal(calls, 0);
});

test("two independent stages retain layout limits, output limits and lazy extensions", () => {
  let initialized = 0;
  const capability = createOperationCapability(() => {
    initialized++;
    return () => null;
  });
  const extensions = [defineOperationExtension({}, capability, {})];
  assert.deepEqual(render(content, { extensions }), render(content));
  assert.equal(initialized, 0);
  assert.throws(() => render(content, { limits: { pages: 0 } }), /limit/u);
  const options = { limits: { outputBytes: 0 } };
  assert.equal(layout(content, options).pageCount, 1);
  assert.throws(() => render(content, options), /limit/u);
});

test("trusted callbacks may mutate options between independent snapshots without executing new getters", () => {
  let getters = 0;
  const options: LowerOptions = {};
  const authored = h(Document, {
    children: h(Page, {
      size: { width: 20, height: 20 },
      children: h(() => {
        Object.defineProperty(options, "text", {
          get() {
            getters++;
            return undefined;
          },
        });
        return h("rect", rect);
      }, {}),
    }),
  });
  assert.throws(() => render(authored, options), DocumentError);
  assert.equal(getters, 0);
});
