/** @jsxImportSource @updf/core */

import * as Core from "@updf/core";
import { render } from "@updf/core";
import { lower } from "@updf/core/vdom";
import * as Layout from "@updf/layout";
import { Document, document, Flow, flow, layout, paragraph, pt } from "@updf/layout";

const margins = { top: 10, right: 10, bottom: 10, left: 10 };
const pageSize = { width: 200, height: 100 };
const content = paragraph({
  children: "Portable flow\ncomplete lines",
  style: { fontSize: 10, lineHeight: pt(12) },
});
const result = layout(document({ children: flow({ pageSize, margins, children: content }) }));
const bytes = render(
  lower(
    <Document>
      <Flow pageSize={pageSize} margins={margins}>
        {content}
      </Flow>
    </Document>,
  ),
);
const expected = render(result.document);
if (bytes.length !== expected.length || bytes.some((byte, i) => byte !== expected[i])) throw new Error("flow parity");
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
const custom = layout(
  document({
    children: flow({
      pageSize,
      margins,
      extensions,
      children: [content, Layout.extension(adapter, { heights: [10] }), content],
    }),
  }),
);
if (new Set(custom.placements.map((placement) => placement.sourceIndex)).size !== 3 || !render(custom.document).length)
  throw new Error("public external adapter");
const plan = Layout.createDecorationPlan([{ edge: "before", repeat: "first", height: 2, nodes: [] }]);
const stacked = Layout.block({
  children: [Layout.extension(adapter, { heights: [10] })],
  decorations: plan,
  keepTogether: true,
  style: {
    width: 170,
    maxWidth: 180,
    height: 15,
    padding: { top: 1, right: 1, bottom: 1, left: 1 },
    border: { width: 1, color: [0, 1, 0] },
    gap: 1,
    overflow: "hidden",
  },
});
if (!render(layout(document({ children: flow({ pageSize, margins, extensions, children: stacked }) })).document).length)
  throw new Error("stacked public block");
const plainStack = Layout.block({ children: [content], style: { minHeight: 40 } });
const stackData = layout(document({ children: flow({ pageSize, margins, children: plainStack }) }));
const stackJSX = render(
  lower(
    <Document>
      <Flow pageSize={pageSize} margins={margins}>
        {plainStack}
      </Flow>
    </Document>,
  ),
);
const stackBytes = render(stackData.document);
if (stackBytes.length !== stackJSX.length || stackBytes.some((byte, i) => byte !== stackJSX[i]))
  throw new Error("native block TSX parity");
if (result.pageCount !== 1) throw new Error("native flow page count");
for (const keepTogether of [false, true]) {
  const fractional = (
    <Document>
      <Flow pageSize={{ width: 760.03, height: 730.9 }} margins={{ top: 700, right: 0, bottom: 0, left: 700 }}>
        {paragraph({
          children: "AAAAAAAAA\nAAAAAAAAA\nAAAAAAAAA",
          style: { fontSize: 10, lineHeight: pt(10.3) },
          keepTogether,
        })}
      </Flow>
    </Document>
  );
  const native = layout(fractional);
  if (native.pageCount !== 1) throw new Error("fractional pagination");
  const actual = render(lower(fractional));
  const expected = render(native.document);
  if (actual.length !== expected.length || actual.some((byte, i) => byte !== expected[i]))
    throw new Error("fractional TSX");
}
if (!bytes.length) {
  // @ts-expect-error Transitional flow roots are retired.
  void Layout.layoutFlow;
  // @ts-expect-error Unknown transitional flow root is retired.
  void Layout.layoutFlowUnknown;
  // @ts-expect-error Native Flow has regions, not a transitional Document.
  void Flow.Document;
  // @ts-expect-error Visible/auto/scroll overflow is not implemented.
  Layout.block({ children: [], style: { overflow: "scroll" } });
  // @ts-expect-error Owned decoration entries are deeply immutable.
  plan.entries[0]!.nodes.push({ type: "rect", x: 0, y: 0, width: 1, height: 1 });
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
  // @ts-expect-error Derived-axis certificates remain private.
  const certificate: Layout.DerivedAxis = { start: 0, end: 100, nominalExtent: 100, capacity: 1000 };
  void certificate;
  // @ts-expect-error Results and fixed output are immutable.
  result.document.pages.push({ width: 1, height: 1, children: [] });
  // @ts-expect-error Native Document no longer accepts a transitional template.
  const oldDocument = <Document pageTemplate={{ ...pageSize, margins }} />;
  void oldDocument;
  // @ts-expect-error Flow is an ordinary component, not an intrinsic grammar.
  const intrinsic = <flowDocument />;
  void intrinsic;
  const invalidFixed: Layout.FixedBlock = {
    type: "fixed",
    height: 10,
    // @ts-expect-error Native fixed block data cannot be a JSX node array.
    children: [<rect x={0} y={0} width={1} height={1} />],
  };
  void invalidFixed;
  // @ts-expect-error Tables remain outside the layout root.
  void Layout.layoutTable;
  // @ts-expect-error Core remains independent of layout.
  void Core.layoutFlow;
  // @ts-expect-error DOM tags are not native JSX.
  const html = <div />;
  void html;
}

// @ts-expect-error Obsolete public subpath is not exported.
import type { TableDefinition as OldTable } from "@updf/layout/tables";
// @ts-expect-error Obsolete public subpath is not exported.
import type { Tables as OldTables } from "@updf/layout/tables/vdom";
// @ts-expect-error Obsolete public subpath is not exported.
import type { Document as OldDocument } from "@updf/layout/vdom";
export type Rejected = OldDocument | OldTable | OldTables;
