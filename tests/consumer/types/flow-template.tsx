/** @jsxImportSource @updf/core */

import * as Core from "@updf/core";
import { render } from "@updf/core";
import { lower } from "@updf/core/vdom";
import * as Layout from "@updf/layout";
import { type FlowDocumentDefinition, layoutFlow, layoutFlowUnknown } from "@updf/layout";
import { Flow } from "@updf/layout/vdom";

const definition: FlowDocumentDefinition = {
  pageTemplate: { width: 200, height: 100, margins: { top: 10, right: 10, bottom: 10, left: 10 } },
  body: [
    {
      type: "paragraph",
      paragraph: {
        defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
        runs: [{ text: "Portable flow\ncomplete lines" }],
        lineHeight: 12,
        align: "left",
        whiteSpace: "preserve",
        breakLongWords: "error",
      },
    },
  ],
};
const result = layoutFlow(definition);
const adapter = Layout.defineBlockAdapter<{ readonly heights: readonly number[] }>({
  name: "consumer.chart",
  validate(input) {
    if (!input || typeof input !== "object" || !Reflect.has(input, "heights")) throw new Error("chart data");
    return input as { readonly heights: readonly number[] };
  },
  measure(props, context) {
    const height = props.heights[0] ?? 10;
    if (!context.width) {
      // @ts-expect-error Adapter props are deeply readonly, including arrays.
      props.heights.push(1);
    }
    return {
      fragmentation: "atomic",
      extent: 1,
      naturalSize: { width: context.width, height },
      fragment(request) {
        if (height > request.availableHeight) return { status: "defer" };
        return {
          status: "placed",
          nextOffset: 1,
          height,
          nodes: [{ type: "rect", x: 0, y: 0, width: context.width, height, paint: { stroke: null } }],
        };
      },
    };
  },
});
const extensions = Layout.createExtensions([adapter]);
const custom = layoutFlow(
  { ...definition, body: [definition.body[0]!, Layout.extension(adapter, { heights: [10] }), definition.body[0]!] },
  {},
  extensions,
);
if (custom.consumed !== 3 || !render(custom.document).length) throw new Error("public external adapter");
const plan = Layout.createDecorationPlan([{ edge: "before", repeat: "first", height: 2, nodes: [] }]);
const stacked = Layout.block({
  children: [Layout.extension(adapter, { heights: [10] })],
  decorations: plan,
  style: {
    width: 170,
    maxWidth: 180,
    height: 15,
    padding: { top: 1, right: 1, bottom: 1, left: 1 },
    border: { width: 1, color: [0, 1, 0] },
    gap: 1,
    overflow: "hidden",
  },
  keepTogether: true,
});
if (!render(layoutFlow({ ...definition, body: [stacked] }, {}, extensions).document).length)
  throw new Error("stacked public block");
const plainStack = { ...definition, body: [Layout.block({ children: definition.body, style: { minHeight: 40 } })] };
const plainStackBytes = render(layoutFlow(plainStack).document);
const plainStackJSX = render(lower(<Flow.Document {...plainStack} />));
if (
  plainStackBytes.some((byte, index) => byte !== plainStackJSX[index]) ||
  plainStackBytes.length !== plainStackJSX.length
)
  throw new Error("transitional block TSX");
const bytes = render(lower(<Flow.Document {...definition} />));
const expected = render(result.document);
if (bytes.length !== expected.length || bytes.some((byte, i) => byte !== expected[i])) throw new Error("flow parity");
if (layoutFlowUnknown(definition).pageCount !== 1) throw new Error("unknown flow");
for (const keepTogether of [false, true]) {
  const fractional: FlowDocumentDefinition = {
    pageTemplate: { width: 760.03, height: 730.9, margins: { top: 700, right: 0, bottom: 0, left: 700 } },
    body: [
      {
        type: "paragraph",
        keepTogether,
        paragraph: {
          defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
          runs: [{ text: "AAAAAAAAA\nAAAAAAAAA\nAAAAAAAAA" }],
          lineHeight: 10.3,
          align: "left",
          whiteSpace: "preserve",
          breakLongWords: "error",
        },
      },
    ],
  };
  const native = layoutFlowUnknown(fractional);
  if (native.pageCount !== 1) throw new Error("fractional pagination");
  const actual = render(lower(<Flow.Document {...fractional} />));
  const expected = render(native.document);
  if (actual.length !== expected.length || actual.some((byte, i) => byte !== expected[i]))
    throw new Error("fractional TSX");
}
if (!bytes.length) {
  // @ts-expect-error Owned decoration entries are deeply immutable.
  plan.entries[0]!.nodes.push({ type: "rect", x: 0, y: 0, width: 1, height: 1 });
  // @ts-expect-error Visible/auto/scroll overflow is not implemented.
  Layout.block({ children: [], style: { overflow: "scroll" } });
  // @ts-expect-error Serialized objects are not owned decoration capabilities.
  Layout.block({ children: [], decorations: { entries: [] } });
  // @ts-expect-error Public adapters require owned identity, not an arbitrary kind object.
  Layout.createExtensions([{ name: "forged" }]);
  const asyncBlock: Layout.MeasuredBlock = {
    fragmentation: "atomic",
    naturalSize: { width: 100, height: 10 },
    extent: 1,
    // @ts-expect-error Async fragment producers are not supported.
    fragment: async () => ({ status: "defer" }),
  };
  void asyncBlock;
  // @ts-expect-error Derived-axis certificates are private, not user-supplied plans.
  const certificate: Layout.DerivedAxis = { start: 0, end: 100, nominalExtent: 100, capacity: 1000 };
  void certificate;
  // @ts-expect-error Results and the fixed document are immutable.
  result.document.pages.push({ width: 1, height: 1, children: [] });
  // @ts-expect-error Fixed blocks require an explicit positive height (also runtime validated).
  const missing: FlowDocumentDefinition = { ...definition, body: [{ type: "fixed", children: [] }] };
  void missing;
  // @ts-expect-error Flow is an ordinary component, not a second intrinsic grammar.
  const intrinsic = <flowDocument />;
  void intrinsic;
  layoutFlow({
    ...definition,
    // @ts-expect-error Native fixed children cannot be JSX nodes.
    body: [{ type: "fixed", height: 10, children: [<rect x={0} y={0} width={1} height={1} />] }],
  });
  // @ts-expect-error No future tables are exported by the flow root.
  void Layout.layoutTable;
  // @ts-expect-error Core remains independent of layout.
  void Core.layoutFlow;
  // @ts-expect-error A DOM tag is not native JSX.
  const html = <div />;
  void html;
}
