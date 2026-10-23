import { array, fail, finite, number, snapshotData, validateDataObject } from "@updf/core/internal";
import type { InlineMetric } from "./inline.js";
import type { InlineLineHeights } from "./line-height.js";

export function captureInlineMetrics(
  input: readonly InlineMetric[],
  runCount: number,
  limit: number,
  path: string,
  visit: (value: unknown) => void,
): readonly InlineMetric[] {
  const result = snapshotData(input, path, undefined, visit);
  array(result, limit, path);
  const seen = new Set<number>();
  for (const [index, visual] of result.entries()) {
    const at = `${path}/${index}`;
    validateDataObject(visual, ["runIndex", "path", "metrics"], at);
    if (
      !Number.isSafeInteger(visual.runIndex) ||
      visual.runIndex < 0 ||
      visual.runIndex >= runCount ||
      seen.has(visual.runIndex)
    )
      fail("TYPE", `${at}/runIndex`, "Expected unique paragraph run index");
    seen.add(visual.runIndex);
    if (typeof visual.path !== "string") fail("TYPE", `${at}/path`, "Expected source path");
    validateMetrics(visual.metrics, `${at}/metrics`);
  }
  return result;
}
function validateMetrics(metrics: InlineMetric["metrics"], path: string): void {
  validateDataObject(metrics, ["advance", "ascent", "descent", "left", "right", "top", "bottom", "empty"], path);
  number(metrics.advance, `${path}/advance`, true);
  number(metrics.ascent, `${path}/ascent`);
  number(metrics.descent, `${path}/descent`);
  number(metrics.ascent + metrics.descent, path, true);
  for (const key of ["left", "right", "top", "bottom"] as const) finite(metrics[key], `${path}/${key}`);
  if (typeof metrics.empty !== "boolean") fail("TYPE", `${path}/empty`, "Expected boolean");
  if (!metrics.empty && (metrics.left > metrics.right || metrics.top > metrics.bottom))
    fail("GEOMETRY", path, "Inverted inline ink bounds");
}
export function validateInlineHeight(height: boolean | InlineLineHeights, limit: number, path: string): void {
  if (typeof height === "boolean") return;
  validateDataObject(height, ["strut", "runs"], path);
  if ("runs" in height) array(height.runs, limit, `${path}/runs`);
}
