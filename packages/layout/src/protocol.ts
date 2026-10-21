import type { Matrix, NodeDefinition } from "@updf/core";
import type { BoxPlacement } from "@updf/layout-boxes/boxes";
import type { OutputBudget } from "./budget.js";
import type { FragmentState } from "./fragment-state.js";
import type { GeneratedInterval } from "./generated-interval.js";
import type { ContentLine } from "./content-types.js";

/** Private producer seam. Public callback results are checked before reaching this seam. */
export interface FragmentRequestContext {
  readonly offset: number;
  readonly width: number;
  readonly budget?: OutputBudget;
  readonly state?: FragmentState;
  readonly reserve?: AncestorReservation;
}
export interface RegionFragmentRequest extends FragmentRequestContext {
  readonly mode?: never;
  readonly availableHeight: number;
  readonly freshHeight: number;
  readonly atFreshRegion: boolean;
  readonly usedHeight: number;
  readonly definiteAlignment?: boolean;
  readonly alignmentHeight?: number;
}
export interface CompleteFragmentRequest extends FragmentRequestContext {
  readonly mode: "complete";
}
export type FragmentRequest = RegionFragmentRequest | CompleteFragmentRequest;
export interface AncestorReservation {
  readonly parent?: AncestorReservation;
  readonly apply: (budget: OutputBudget | undefined, state: FragmentState | undefined, height: number) => number;
}
export interface FragmentPaintContext {
  readonly incomingMatrix: Matrix;
  readonly x: number;
  readonly y: number;
  readonly budget: OutputBudget;
  readonly partPositions: readonly number[];
  readonly children: readonly PreparedFragmentPaint[];
}
export type BoxAssociation = "positioned-box" | "translated-box";
export interface FragmentPart {
  /** Host reporting metadata; never consulted for selection or admission. */
  readonly line?: ContentLine;
  readonly association?: BoxAssociation;
  readonly offset: number;
  readonly height: number;
  readonly certificate?: GeneratedInterval;
  readonly reservation: "slot" | "whole-box";
}
export interface FragmentChild {
  readonly fragment: PlacedFragment;
  readonly x: number;
  readonly y: number;
  readonly frame: "local" | "relative" | "zero";
  readonly hidden?: boolean;
  readonly bounds?: { readonly start: number; readonly end: number };
}
export type FragmentPaintStep = { readonly part: number } | { readonly child: number };
export interface FragmentGeometry {
  readonly association?: BoxAssociation;
  readonly parts: readonly FragmentPart[];
  readonly children: readonly FragmentChild[];
  readonly order: readonly FragmentPaintStep[];
}
export interface PreparedFragmentPaint {
  readonly fragment: PlacedFragment;
  readonly context: FragmentPaintContext;
}
export interface PlacedFragment {
  readonly geometry: FragmentGeometry;
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
export type PaintCall = PreparedFragmentPaint;
export interface PreparedBlock {
  readonly rowPlacement?: BoxPlacement;
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
