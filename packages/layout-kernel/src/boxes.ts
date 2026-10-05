/**
 * `@updf/layout-kernel/boxes`: bounded synchronous host-tree sizing and prepared
 * row placement. No pagination, painting, clipping, text engine or CSS flexbox.
 * Use one consistent host length unit (layout consumers use PDF points).
 */
export { layoutBoxes } from "./box-layout.js";
export type { BoxOffset, BoxPlacement, ResolvedBoxSize } from "./box-placement.js";
export { type PreparedBoxView, viewBox } from "./box-prepared.js";
export type {
  BoxAllocation,
  BoxLayout,
  BoxLimits,
  BoxRecord,
  BoxStyle,
  BoxView,
  LayoutBoxesInput,
} from "./box-types.js";
