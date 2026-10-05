/** Point widths or positive weighted shares of the remaining space. */
export type WidthTrack = number | WeightedWidth;
/** Positive finite relative share; min defaults to Number.MIN_VALUE, max to availableWidth. */
export interface WeightedWidth {
  readonly weight: number;
  readonly min?: number;
  readonly max?: number;
}
/** Own enumerable data fields and a nonempty dense track array; all lengths are points. */
export interface WidthResolutionInput {
  readonly availableWidth: number;
  readonly tracks: readonly WidthTrack[];
  /** Uniform point gap between adjacent tracks; defaults to zero. */
  readonly gap?: number;
  /** Caller budget, checked before scanning tracks; defaults to 10,000. */
  readonly maxTracks?: number;
}
/** Frozen allocation snapshot, not a live view of the caller's tracks. */
export interface WidthResolution {
  readonly widths: readonly number[];
  readonly gap: number;
  /** Upward-rounded exact occupied extent, including gaps. */
  readonly occupiedWidth: number;
  /** Downward-rounded exact unallocated extent, including rounding slack. */
  readonly unusedWidth: number;
}
