import type { MeasuredNode, MeasuredPage } from "../core/plan.js";
import type { ResolvedPaint } from "./types.js";

export interface Alpha {
  readonly key: string;
  readonly fill: number;
  readonly stroke: number;
}
export function alphaKey(paint: ResolvedPaint): string {
  return `${paint.fill ? paint.fillOpacity : 1}|${paint.stroke && paint.width ? paint.strokeOpacity : 1}`;
}
export function collectAlpha(pages: readonly MeasuredPage[]): readonly Alpha[] {
  const result = new Map<string, Alpha>();
  for (const page of pages) visit(page.children, result);
  return [...result.values()];
}
function visit(nodes: readonly MeasuredNode[], result: Map<string, Alpha>): void {
  for (const node of nodes) {
    if (node.type === "paintGroup") visit(node.children, result);
    else if (node.type !== "text" && node.painting) {
      const key = alphaKey(node.painting.paint);
      if (key === "1|1" || result.has(key)) continue;
      result.set(key, {
        key: `GS${result.size + 1}`,
        fill: node.painting.paint.fill ? node.painting.paint.fillOpacity : 1,
        stroke: node.painting.paint.stroke && node.painting.paint.width ? node.painting.paint.strokeOpacity : 1,
      });
    }
  }
}
