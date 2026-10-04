import type { NodeDefinition } from "@updf/core";
import type { OutputBudget } from "./budget.js";
import type { FragmentState } from "./fragment-state.js";
import type { GeneratedInterval } from "./generated-interval.js";

/** Private producer seam. Public callback results are checked before reaching this seam. */
export interface FragmentRequest {
  readonly offset: number;
  readonly availableHeight: number;
  readonly freshHeight: number;
  readonly atFreshRegion: boolean;
  readonly width: number;
  readonly usedHeight: number;
  readonly definiteAlignment?: boolean;
  readonly alignmentHeight?: number;
  readonly budget?: OutputBudget;
  readonly state?: FragmentState;
  readonly reserve?: AncestorReservation;
}
export interface AncestorReservation {
  readonly parent?: AncestorReservation;
  readonly apply: (budget: OutputBudget | undefined, state: FragmentState | undefined, height: number) => number;
}
export interface FragmentPaintContext {
  readonly x: number;
  readonly y: number;
  readonly budget: OutputBudget;
  readonly start: (offset: number, height: number, certificate?: GeneratedInterval) => number;
}
export interface PlacedFragment {
  readonly nextOffset: number;
  readonly height: number;
  readonly advance?: boolean;
  readonly lines?: { readonly start: number; readonly end: number };
  readonly paint: (context: FragmentPaintContext) => readonly NodeDefinition[];
  readonly paintSteps?: (
    context: FragmentPaintContext,
  ) => Generator<PaintCall, readonly NodeDefinition[], readonly NodeDefinition[]>;
}
export interface FragmentCall {
  readonly block: PreparedBlock;
  readonly request: FragmentRequest;
}
export interface PaintCall {
  readonly fragment: PlacedFragment;
  readonly context: FragmentPaintContext;
}
export interface PreparedBlock {
  readonly autoMargin?: boolean;
  readonly contentAlignment?: { readonly height: number; readonly capacity: number };
  readonly containsAutoAlignment?: boolean;
  readonly sourceExtent?: number;
  readonly sourceKeys?: readonly (string | number | null)[];
  readonly sourcePaths?: readonly string[];
  readonly fragmentation: "atomic" | "splittable";
  readonly naturalSize: { readonly width: number; readonly height: number };
  readonly extent: number;
  readonly x?: number;
  readonly control?: "advance";
  readonly fragment: (request: FragmentRequest) => PlacedFragment | undefined;
  readonly fragmentSteps?: (
    request: FragmentRequest,
  ) => Generator<FragmentCall, PlacedFragment | undefined, PlacedFragment | undefined>;
}
