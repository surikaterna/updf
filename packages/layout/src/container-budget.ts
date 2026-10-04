import { borderRectangles } from "./border-rectangles.js";
import type { BudgetTotals } from "./budget.js";
import type { Sizing } from "./sizing.js";

export function containerTotals(box: Sizing, height: number, hidden: boolean): BudgetTotals {
  if (height === 0) return { nodes: 0, text: 0, commands: 0, work: 0 };
  const rectangles = (box.style.backgroundColor ? 1 : 0) + borderRectangles(box.borders, box.width, height).length;
  return { nodes: 1 + (hidden ? 1 : 0) + rectangles, text: 0, commands: rectangles * 5, work: 0 };
}
