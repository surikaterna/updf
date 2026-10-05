import type { TextRun } from "../core/text-runtime.js";
export interface RunMetrics {
  readonly advance: number;
  readonly left: number;
  readonly right: number;
  readonly ascent: number;
  readonly descent: number;
  readonly top: number;
  readonly bottom: number;
  readonly empty: boolean;
  readonly run?: TextRun;
}
