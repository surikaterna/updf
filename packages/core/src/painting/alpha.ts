import type { MeasuredNode, MeasuredPage } from "../core/plan.js";
import { descendants } from "../core/traversal.js";
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
  for (const node of descendants(nodes, (node) => (node.type === "paintGroup" ? node.children : []))) {
    if (node.type !== "paintGroup" && node.type !== "text" && node.type !== "richText" && node.painting) {
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
