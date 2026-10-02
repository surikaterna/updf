import { fail } from "@updf/core/internal";

export interface Scanner {
  readonly input: string;
  offset: number;
  units: number;
}
export const arity: Readonly<Record<string, number>> = Object.freeze({
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
  Z: 0,
});
export function whitespace(scan: Scanner): void {
  while (/^[\t\n\r ]$/.test(scan.input[scan.offset] ?? "")) scan.offset++;
}
export function command(scan: Scanner): string | undefined {
  whitespace(scan);
  const char = scan.input[scan.offset];
  if (char && /[MmLlHhVvCcSsQqTtAaZz]/.test(char)) {
    scan.offset++;
    return char;
  }
  return undefined;
}
export function numeric(scan: Scanner, flag: boolean, first: boolean): number {
  whitespace(scan);
  if (scan.input[scan.offset] === ",") {
    if (first) fail("PATH_SYNTAX", `/path/${scan.offset}`, "Unexpected comma");
    scan.offset++;
    whitespace(scan);
  }
  const rest = scan.input.slice(scan.offset);
  const value = flag ? /^[01]/.exec(rest)?.[0] : /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest)?.[0];
  if (!value || !Number.isFinite(Number(value)))
    fail("PATH_SYNTAX", `/path/${scan.offset}`, "Expected finite SVG number/flag");
  if (++scan.units > 100000) fail("LIMIT", "/path", "Path scanner budget exceeded");
  scan.offset += value.length;
  return Number(value);
}
export function hasArguments(scan: Scanner): boolean {
  whitespace(scan);
  const next = scan.input[scan.offset];
  return next !== undefined && !/[MmLlHhVvCcSsQqTtAaZz]/.test(next);
}
