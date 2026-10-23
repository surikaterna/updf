import type { PrivateFragment, ParagraphDefinition, TextMeasurement } from "@updf/core/resources";

/** An edge reservation only: it has no visual paint or sibling float behavior. */
export interface RectangularExclusion {
  readonly shape: "rect";
  readonly side: "left" | "right";
  readonly width: number;
  readonly height: number;
  readonly top?: number;
}
/** Positive inward depth from the selected edge, at a local profile height. */
export interface EdgeProfilePoint {
  readonly x: number;
  readonly y: number;
}
/** Vertically ordered linear edge silhouette, closed to the frame edge by horizontal caps. */
export interface EdgeProfileExclusion {
  readonly shape: "edge-profile";
  readonly side: "left" | "right";
  readonly top?: number;
  readonly points: readonly EdgeProfilePoint[];
}
export type TextExclusion = RectangularExclusion | EdgeProfileExclusion;
export interface CompositionInput {
  readonly width: number;
  readonly maxHeight: number;
  readonly paragraphs: readonly ParagraphDefinition[];
  readonly exclusion?: TextExclusion;
}
export interface OccupiedTextBand {
  readonly top: number;
  readonly bottom: number;
  readonly baseline: number;
}
/** Trusted service output; core captures data and retains only opaque run identities. */
export interface CompositionPlan {
  readonly measurement: TextMeasurement;
  readonly bands: readonly OccupiedTextBand[];
  readonly fragments: readonly PrivateFragment[];
}
declare const composedFrame: unique symbol;
/** Operation-owned report. Structural copies cannot authorize native output. */
export interface ComposedTextFrame {
  readonly [composedFrame]: true;
  readonly width: number;
  readonly height: number;
  readonly measurement: TextMeasurement;
  readonly bands: readonly OccupiedTextBand[];
}
