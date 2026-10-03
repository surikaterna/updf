import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import type { TextMeasurementInput } from "@updf/core/measurement";
import { type Component, type ComponentContext, h, lower } from "@updf/core/vdom";

const input: TextMeasurementInput = {
  kind: "plain",
  width: 50,
  text: "abc",
  fontSize: 10,
  lineHeight: 12,
  align: "left",
};
const tree = (component: Component<object>) =>
  h("document", { version: 1, children: h("page", { width: 200, height: 200, children: h(component, {}) }) });
function rejects(action: () => unknown, code: string, pattern?: RegExp): void {
  assert.throws(
    action,
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === code &&
      (!pattern || pattern.test(error.diagnostics[0]?.path ?? "")),
  );
}

test("component measurement is frozen, bound to resources and closed on lower success/failure", () => {
  let retained: ComponentContext | undefined;
  const component: Component<object> = (_props, context) => {
    retained = context;
    assert.ok(Object.isFrozen(context) && Object.isFrozen(context.measurement));
    const measured = context.measurement.measureText(input);
    return h("text", {
      x: 0,
      y: 0,
      width: 50,
      height: measured.consumedHeight,
      text: "abc",
      fontSize: 10,
      lineHeight: 12,
      align: "left",
    });
  };
  lower(tree(component));
  const closed = retained;
  assert.ok(closed);
  rejects(() => closed.measurement.measureText(input), "MEASUREMENT_CONTEXT", /^\/tree.*\/measurement$/);
  const broken: Component<object> = (_props, context) => {
    retained = context;
    throw new Error("failed");
  };
  rejects(() => lower(tree(broken)), "VDOM_COMPONENT");
  assert.ok(retained);
  rejects(() => retained?.measurement.measureText(input), "MEASUREMENT_CONTEXT");
  lower(tree(component));
});

test("remeasurement does not double-charge semantic content; distinct content shares optional text budget", () => {
  const expensive: Component<object> = (_props, context) => {
    for (let i = 0; i < 3000; i++) context.measurement.measureText(input);
    return null;
  };
  assert.ok(lower(tree(expensive), { profile: "service" }));
  const textHeavy: Component<object> = (_props, context) => {
    for (let i = 0; i < 26; i++) context.measurement.measureText({ ...input, width: 100000, text: "x".repeat(4096) });
    return null;
  };
  rejects(() => lower(tree(textHeavy), { profile: "service" }), "LIMIT");
});

test("measurement diagnostics preserve component origin, run path and cannot accept a caller path", () => {
  const component: Component<object> = (_props, context) => {
    context.measurement.measureText({
      kind: "rich",
      width: 20,
      paragraphs: [
        {
          defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
          runs: [{ text: "\t" }],
          lineHeight: 12,
          align: "left",
          whiteSpace: "preserve",
          breakLongWords: "error",
        },
      ],
    });
    return null;
  };
  rejects(() => lower(tree(component)), "CHARACTER", /^\/tree.*\/measurement\/paragraphs\/0\/runs\/0\/text$/);
  assert.throws(
    () => lower(tree(component)),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.span?.start === 0 &&
      error.diagnostics[0]?.span?.end === 1,
  );
  const badDrawing: Component<object> = () =>
    h("richText", {
      x: 0,
      y: 0,
      width: 20,
      height: 1,
      paragraphs: [
        {
          defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
          runs: [],
          lineHeight: 12,
          align: "left",
          whiteSpace: "preserve",
          breakLongWords: "error",
        },
      ],
    });
  rejects(() => lower(tree(badDrawing)), "VERTICAL_OVERFLOW", /^\/tree.*\/expanded\/props\/height$/);
});

test("plain lowering keeps historical deferred wrapping validation", () => {
  const component: Component<object> = () =>
    h("text", { x: 0, y: 0, width: 1, height: 12, text: "long", fontSize: 10, lineHeight: 12, align: "left" });
  assert.equal(lower(tree(component)).pages[0]?.children[0]?.type, "text");
});
