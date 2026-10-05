import { LayoutInputError, resolveWidths, type WidthResolution, type WidthTrack } from "@updf/layout-kernel";
import { type BoxStyle, type BoxView, layoutBoxes } from "@updf/layout-kernel/boxes";
import { bits, dyadic, floorDyadic, spacing, successor, value } from "@updf/layout-kernel/numeric";

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
if (measured.boxes.length === 0) {
  // @ts-expect-error renderer must supply measurement height
  layoutBoxes({ root: leaf, view, width: 80, measure: () => ({ width: 3 }) });
  // @ts-expect-error no CSS shrink support
  const bad: BoxStyle = { flexShrink: 1 };
  void bad;
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
