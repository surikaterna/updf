import { type BorderPolicy, expandBorders } from "@updf/layout";
import type { CellStyle } from "./types.js";

const keys = ["border", "borderTop", "borderRight", "borderBottom", "borderLeft"] as const;

export function cellBorders(style: CellStyle, path: string) {
  const policy = Object.fromEntries(keys.filter((key) => key in style).map((key) => [key, style[key]]));
  return expandBorders(policy as BorderPolicy, path);
}
