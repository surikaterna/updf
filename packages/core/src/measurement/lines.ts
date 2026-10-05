import type { TextRun } from "../core/text-runtime.js";
import type { TextFragmentMeasurement } from "./types.js";
export interface PrivateFragment extends TextFragmentMeasurement {
  readonly baseline: number;
  readonly run?: TextRun;
  readonly path: string;
}
