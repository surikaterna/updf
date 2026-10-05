import type { TextRun } from "@updf/core/resources";
import { type ResolvedTextResources as ResolvedFonts, selectedFont, textRuntime } from "./text-resources.js";
import type { InkBounds, TextStyle } from "./types.js";

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
export function metrics(text: string, style: TextStyle, fonts: ResolvedFonts, path: string): RunMetrics {
  const font = selectedFont(style.font, fonts, path);
  const runtime = textRuntime(fonts, path);
  // Plain/native ink retains fixed conservative arithmetic but uses actual ink for centered envelopes.
  const mode = runtime.fixedPolicy(font, path).baseline === "ascent" ? "fixed" : "rich";
  return runtime.measure(font, text, style.fontSize, mode, path);
}
export function richMetrics(text: string, style: TextStyle, fonts: ResolvedFonts, path: string): RunMetrics {
  const font = selectedFont(style.font, fonts, path);
  return textRuntime(fonts, path).measure(font, text, style.fontSize, "rich", path);
}
export function ink(run: RunMetrics, x: number, baseline: number): InkBounds {
  return Object.freeze(
    run.empty
      ? { empty: true }
      : {
          empty: false,
          left: x + run.left,
          right: x + run.right,
          top: baseline + run.top,
          bottom: baseline + run.bottom,
        },
  );
}
export function union(bounds: readonly InkBounds[]): InkBounds {
  const nonempty = bounds.filter((item) => !item.empty);
  if (!nonempty.length) return Object.freeze({ empty: true });
  return Object.freeze({
    empty: false,
    left: nonempty.reduce((edge, item) => Math.min(edge, item.left), Infinity),
    right: nonempty.reduce((edge, item) => Math.max(edge, item.right), -Infinity),
    top: nonempty.reduce((edge, item) => Math.min(edge, item.top), Infinity),
    bottom: nonempty.reduce((edge, item) => Math.max(edge, item.bottom), -Infinity),
  });
}
