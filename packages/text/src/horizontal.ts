import { exceeds, MetricSum, sum } from "./arithmetic.js";
import type { RunMetrics } from "./metrics.js";

export interface HorizontalExtent {
  readonly advance: number;
  readonly left: number;
  readonly right: number;
}

/** Retain advances and ink in the same local frame; side bearings consume real space. */
export class HorizontalMeasure {
  private readonly total = new MetricSum();
  private left = 0;
  private right = 0;

  add(metrics: RunMetrics): void {
    if (!metrics.empty) {
      this.left = Math.min(this.left, this.total.value + metrics.left);
      this.right = Math.max(this.right, this.total.value + metrics.right);
    }
    this.total.add(metrics.advance);
  }

  get extent(): HorizontalExtent {
    return { advance: this.total.value, left: this.left, right: Math.max(this.right, this.total.value) };
  }
}

export function horizontal(items: readonly { readonly metrics: RunMetrics }[]): HorizontalExtent {
  const measure = new HorizontalMeasure();
  for (const item of items) measure.add(item.metrics);
  return measure.extent;
}

export function joined(a: HorizontalExtent, b: HorizontalExtent): HorizontalExtent {
  const advance = sum([a.advance, b.advance]);
  return {
    advance,
    left: Math.min(a.left, a.advance + b.left),
    right: Math.max(a.right, a.advance + b.right, advance),
  };
}

export function horizontalWidth(extent: HorizontalExtent): number {
  return sum([extent.right, -extent.left]);
}

export function horizontalOrigin(extent: HorizontalExtent, width: number, align: "left" | "center" | "right"): number {
  const spare = width - extent.advance;
  const preferred = align === "center" ? spare / 2 : align === "right" ? spare : 0;
  const left = preferred + extent.left;
  const right = preferred + extent.right;
  // Preserve advance-based alignment (including native padded fragments) when it fits.
  if (!exceeds(-left, 0, Math.max(Math.abs(preferred), extent.advance)) && !exceeds(right, width)) return preferred;
  return Math.max(-extent.left, Math.min(preferred, width - extent.right));
}
