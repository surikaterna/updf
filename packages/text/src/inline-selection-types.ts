import type { InlineLine, InlineMetric } from "./inline.js";
import type { InlineLineHeights } from "./line-height.js";
import type { ParagraphDefinition } from "./types.js";

declare const continuationBrand: unique symbol;
declare const selectionBrand: unique symbol;
/** Opaque source position, not a line index or a mutable committed cursor. */
export interface InlineContinuation {
  readonly [continuationBrand]: true;
}
export interface InlineSelection {
  readonly [selectionBrand]: true;
}
export interface SelectedInlineLine {
  readonly startOffset: number;
  readonly nextOffset: number;
  readonly measured: InlineLine;
  readonly width: number;
  readonly continuation: InlineContinuation | undefined;
}
export interface InlineSelectionOperation {
  /** Conservative line-box/ink band for any selected subset; never consumes the source.
   * top is finite nonnegative host-local y. nominalHeight/nextTop are retry policy only.
   */
  readonly inlineBand: (
    source: InlineContinuation,
    top: number,
    path?: string,
  ) => {
    readonly top: number;
    readonly bottom: number;
    readonly nominalHeight: number;
    readonly nextTop: number;
  };
  /** Charged, nonmutating first-unit width probe; only word/visual blockage returns false. */
  readonly canSelectInline: (source: InlineContinuation, width: number, path?: string) => boolean;
  readonly inlinePosition: (
    continuation: InlineContinuation,
    path?: string,
  ) => {
    readonly offset: number;
    readonly extent: number;
  };
  readonly resumeInline: (source: InlineContinuation, offset: number, path?: string) => InlineContinuation;
  readonly prepareInline: (
    paragraph: ParagraphDefinition,
    visuals: () => readonly InlineMetric[],
    width: number,
    height: boolean | InlineLineHeights,
    path?: string,
  ) => InlineContinuation;
  readonly selectInline: (
    continuation: InlineContinuation,
    request: { readonly width: number; readonly maxHeight?: number },
    path?: string,
  ) => InlineSelection | undefined;
  readonly selectedInline: (selection: InlineSelection, path?: string) => SelectedInlineLine;
}
