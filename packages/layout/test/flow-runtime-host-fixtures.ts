import {
  block,
  column,
  createDecorationPlan,
  createExtensions,
  defineBlockAdapter,
  extension,
  row,
} from "@updf/layout";
import { layoutFlow } from "../../../tests/fixtures/transitional-layout.js";
import { richNode } from "../../../tests/fixtures/rich-input.js";
import { fixed, flow, paragraph } from "./fixtures.js";

export function nestedFixture() {
  const trace: unknown[] = [];
  const adapter = defineBlockAdapter({
    name: "flow-runtime.nested",
    validate: (input) => input as { label: string; height: number },
    measure(props, context) {
      trace.push(["measure", props.label, context.width]);
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: context.width, height: props.height },
        fragment(request) {
          trace.push(["fragment", props.label, request]);
          if (props.height > request.availableHeight) return { status: "defer" };
          return {
            status: "placed",
            nextOffset: 1,
            height: props.height,
            nodes: [richNode(props.label, { height: props.height }, { lineHeight: 10 })],
          };
        },
      };
    },
  });
  const item = (label: string, height: number) => extension(adapter, { label, height });
  const result = layoutFlow(
    flow(
      [
        block({
          children: [item("A", 25), { type: "pageBreak" }, block({ children: [item("B", 20), item("C", 20)] })],
        }),
      ],
      { height: 50, header: { height: 10, children: [fixed("H")] }, footer: { height: 10, children: [fixed("F")] } },
    ),
    {},
    createExtensions([adapter]),
  );
  return { trace, result };
}

export function decorationFixture() {
  const trace: unknown[] = [];
  const plan = createDecorationPlan([{ edge: "after", repeat: "last", height: 10, nodes: [fixed("LAST")] }]);
  const run = { text: "selected" };
  const shared = {
    status: "placed" as const,
    nextOffset: 1,
    height: 20,
    nodes: [{ ...fixed(), paragraphs: [{ ...paragraph(""), runs: [run] }] }],
  };
  const adapter = defineBlockAdapter({
    name: "flow-runtime.decorated",
    validate: (input) => input,
    measure: () => ({
      fragmentation: "splittable",
      extent: 2,
      naturalSize: { width: 100, height: 40 },
      decorations: plan,
      fragment(request) {
        trace.push(["fragment", request]);
        const count = Math.min(2 - request.offset, Math.floor(request.availableHeight / 20));
        if (!count) return { status: "defer" };
        shared.nextOffset = request.offset + count;
        shared.height = count * 20;
        run.text = count === 2 ? "discarded" : `selected${request.offset}`;
        return shared;
      },
    }),
  });
  const result = layoutFlow(
    flow([extension(adapter, {})]),
    { limits: { textCodePoints: 22 } },
    createExtensions([adapter]),
  );
  run.text = "mutated after layout";
  return { trace, result };
}

export function rowFixture() {
  const trace: unknown[] = [];
  const adapter = defineBlockAdapter({
    name: "flow-runtime.row",
    validate: (input) => input as { label: string; height: number },
    measure(props, context) {
      trace.push(["measure", props.label, context.width]);
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: context.width, height: props.height },
        fragment(request) {
          trace.push(["fragment", props.label, request]);
          return {
            status: "placed",
            nextOffset: 1,
            height: props.height,
            nodes: [richNode(props.label, { width: context.width, height: props.height }, { lineHeight: 10 })],
          };
        },
      };
    },
  });
  const result = layoutFlow(
    flow(
      [
        { type: "spacer", height: 15 },
        row({
          children: [
            column({ width: 40, children: [extension(adapter, { label: "L", height: 20 })] }),
            column({ width: 60, children: [extension(adapter, { label: "R", height: 10 })] }),
          ],
        }),
      ],
      { height: 30 },
    ),
    {},
    createExtensions([adapter]),
  );
  return { trace, result };
}
