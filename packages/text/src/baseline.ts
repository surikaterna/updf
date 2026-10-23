import { sum } from "./arithmetic.js";

export function lineLeading(height: number, ascent: number, descent: number): number {
  return (height - sum([ascent, descent])) / 2;
}

export function lineBaseline(top: number, ascent: number, leading: number): number {
  return top + ascent + leading;
}
