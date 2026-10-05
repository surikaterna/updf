import type { RunMetrics } from "./metrics.js";
import type { TextLineMeasurement } from "./types.js";
export interface InlineMetric {
  readonly runIndex: number;
  readonly path: string;
  readonly metrics: RunMetrics;
}
export interface InlineLine {
  readonly line: TextLineMeasurement;
  readonly nativeTops: readonly number[];
  readonly nativeHeights: readonly number[];
  readonly nativeWidths: readonly number[];
  readonly nativePads: readonly number[];
}
