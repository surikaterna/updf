import { exceeds, type MetricSum, sum } from "@updf/core/internal";
import { fitsMaterialized, type NativeBounds } from "@updf/layout-boxes/geometry";

export interface NativePlacement {
  readonly axis: NativeBounds;
  readonly offset: number;
  readonly minimum?: number;
}
export interface FitFrame {
  readonly usedHeight: number;
  readonly freshHeight: number;
  readonly nativePlacement?: NativePlacement | undefined;
  readonly parentFit?: ParentFit;
  readonly fitScale?: number;
}
interface ParentFit {
  readonly frame: FitFrame;
  readonly before: number;
  readonly after: number;
  readonly fixed?: number;
  readonly prefix?: MetricSum;
  readonly decorations?: { readonly before: readonly number[]; readonly after: readonly number[] };
}

/** Captures only geometry, never operation services/budgets or executable public capabilities. */
export function fitFrame(request: FitFrame): FitFrame {
  return {
    usedHeight: request.usedHeight,
    freshHeight: request.freshHeight,
    ...(request.nativePlacement ? { nativePlacement: request.nativePlacement } : {}),
    ...(request.parentFit ? { parentFit: request.parentFit } : {}),
    ...(request.fitScale === undefined ? {} : { fitScale: request.fitScale }),
  };
}

export function fitsFragment(request: FitFrame, height: number): boolean {
  let frame = request;
  let nativeEnd: number | undefined;
  while (true) {
    if (exceeds(sum([frame.usedHeight, height]), frame.freshHeight, frame.fitScale)) return false;
    const native = frame.nativePlacement;
    if (native && !fitsMaterialized(native.axis, native.offset, height)) return false;
    if (native) {
      const start = native.axis.start + native.offset;
      const end = start + height;
      if (start < (native.minimum ?? native.axis.start) || (nativeEnd !== undefined && nativeEnd > end)) return false;
      nativeEnd = end;
    }
    const parent = frame.parentFit;
    if (!parent) return true;
    if (parent.decorations && !decorationsFit(parent, height)) return false;
    height =
      parent.fixed ?? (parent.prefix ? parent.prefix.preview(height) : sum([parent.before, height, parent.after]));
    frame = parent.frame;
  }
}

function decorationsFit(parent: ParentFit, height: number): boolean {
  const native = parent.frame.nativePlacement;
  const entries = parent.decorations;
  if (!native || !entries) return true;
  const origin = native.axis.start + native.offset;
  const axis = {
    start: native.axis.start,
    end: Math.min(native.axis.end, origin + sum([parent.before, height, parent.after])),
  };
  let offset = 0;
  let bottom = origin;
  for (const extent of entries.before) {
    const position = sum([native.offset, offset]);
    if (!fitsMaterialized(axis, position, extent) || axis.start + position < bottom) return false;
    bottom = axis.start + position + extent;
    offset = sum([offset, extent]);
  }
  if (origin + parent.before < bottom) return false;
  bottom = origin + parent.before + height;
  offset = sum([parent.before, height]);
  for (const extent of entries.after) {
    const position = sum([native.offset, offset]);
    if (!fitsMaterialized(axis, position, extent) || axis.start + position < bottom) return false;
    bottom = axis.start + position + extent;
    offset = sum([offset, extent]);
  }
  return true;
}

export function decorationFit(request: FitFrame, before: readonly number[], after: readonly number[]): ParentFit {
  return { ...parentFit(request, sum(before), sum(after)), decorations: { before, after } };
}

export function parentFit(request: FitFrame, before = 0, after = 0, fixed?: number, prefix?: MetricSum): ParentFit {
  return {
    frame: fitFrame(request),
    before,
    after,
    ...(fixed === undefined ? {} : { fixed }),
    ...(prefix ? { prefix: prefix.fork() } : {}),
  };
}

/** Start a nested paint-group frame with the same translation association used by native painting. */
export function nestedPlacement(
  parent: NativePlacement | undefined,
  top: number,
  bottom?: number,
): NativePlacement | undefined {
  if (!parent) return undefined;
  const start = parent.axis.start + parent.offset;
  const end = bottom === undefined ? parent.axis.end : Math.min(parent.axis.end, start + bottom);
  return { axis: { start, end }, offset: top };
}
