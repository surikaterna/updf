import type { PrivateFragment } from "../measurement/lines.js";
import type { ParagraphDefinition, TextMeasurement } from "../measurement/types.js";

export interface CompositionInput {
  readonly width: number;
  readonly maxHeight: number;
  readonly paragraphs: readonly ParagraphDefinition[];
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
