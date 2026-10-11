import { LayoutInputError, resolveWidths, type WidthResolution, type WidthTrack } from "@updf/layout-boxes";
import {
  type BoxStyle,
  type BoxView,
  layoutBoxes,
  allocateBoxLayout,
  finishBoxLayout,
  type AllocateBoxLayoutInput,
  type BoxLayoutPlan,
  type BoxMeasurementRequest,
  type BoxMeasurementResult,
} from "@updf/layout-boxes/boxes";
import { bits, dyadic, floorDyadic, spacing, successor, value } from "@updf/layout-boxes/numeric";

interface Source {
  readonly id: string;
  readonly style: BoxStyle;
  readonly children: readonly Source[];
  readonly content?: string;
}
const view: BoxView<Source, string> = {
  id: (node) => node.id,
  path: (node) => `/${node.id}`,
  style: (node) => node.style,
  childCount: (node) => node.children.length,
  childAt: (node, i) => node.children[i] as Source,
  content: (node) => node.content,
};
const empty: Source = { id: "empty", style: {}, children: [] };
if (layoutBoxes({ root: empty, view, width: 80 }).boxes[0]?.height !== 0) throw new Error("Empty box failed");
const leaf: Source = { id: "leaf", style: {}, children: [], content: "Opaque host text" };
const measured = layoutBoxes({
  root: leaf,
  view,
  width: 80,
  measure: (content, { allocation }) => ({ height: content.length / allocation.width }),
});
if (measured.counts.measurements !== 1) throw new Error("Leaf measure failed");
const clipped: Source = { ...leaf, style: { overflow: "clip", height: 15, paddingTop: 2, paddingBottom: 3 } };
if (layoutBoxes({ root: clipped, view, width: 80, measure: () => ({ height: 30 }) }).boxes[0]?.height !== 15)
  throw new Error("Clipped geometry failed");
const stagedInput: AllocateBoxLayoutInput<Source, string> = { root: leaf, view, width: 80 };
const plan: BoxLayoutPlan<string> = allocateBoxLayout(stagedInput);
const request: BoxMeasurementRequest<string> = plan.requests[0]!;
const measurements: readonly BoxMeasurementResult<string>[] = [
  { request, height: request.content.length / request.allocation.width },
];
if (finishBoxLayout(plan, measurements).boxes[0]?.height !== measured.boxes[0]?.height)
  throw new Error("Staged measure failed");
if (measured.boxes.length === 0) {
  // @ts-expect-error request identities cannot be fabricated
  const forgedRequest: BoxMeasurementRequest<string> = { content: "text", path: "/leaf", allocation: { width: 80 } };
  // @ts-expect-error plans cannot be fabricated
  const forgedPlan: BoxLayoutPlan<string> = { requests: [] };
  // @ts-expect-error staged inputs do not accept callbacks
  allocateBoxLayout({ ...stagedInput, measure: () => ({ height: 3 }) });
  void forgedRequest;
  void forgedPlan;
  // @ts-expect-error renderer must supply measurement height
  layoutBoxes({ root: leaf, view, width: 80, measure: () => ({ width: 3 }) });
  // @ts-expect-error no CSS shrink support
  const bad: BoxStyle = { flexShrink: 1 };
  void bad;
  // @ts-expect-error overflow has no CSS visible/hidden aliases
  const badOverflow: BoxStyle = { overflow: "hidden" };
  void badOverflow;
}

const tracks: readonly WidthTrack[] = [20, { weight: 1, min: 1, max: 100 }];
const result: WidthResolution = resolveWidths({ availableWidth: 80, tracks, gap: 1 });
if (result.widths[1] !== 59 || !Object.isFrozen(result.widths)) throw new Error("Allocation failed");
const encoded = bits(1);
if (value(floorDyadic(dyadic(encoded)) ?? 0n) !== 1 || spacing(encoded) <= 0n || !successor(encoded))
  throw new Error("Numeric entry failed");
try {
  resolveWidths(null);
} catch (error) {
  if (!(error instanceof LayoutInputError) || error.code !== "TYPE" || error.path !== "/widths") throw error;
}
if (result.widths.length === 0) {
  // @ts-expect-error readonly result
  result.widths.push(1);
}
