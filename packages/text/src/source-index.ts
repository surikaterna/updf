import { fail } from "@updf/core/internal";

/** Logical retained scalars/visuals and hard-break/terminal units, never UTF-16 or lines. */
export function sourceIndex(lengths: readonly number[], charge: (amount: number) => void, path: string) {
  const prefix = [0];
  for (const length of lengths) {
    charge(1);
    const end = prefix.at(-1)! + length;
    if (!Number.isSafeInteger(end)) fail("LIMIT", path, "Inline source extent exceeds safe integer range");
    prefix.push(end);
  }
  return prefix;
}

export function sourceCursor(
  prefix: readonly number[],
  offset: number,
  path: string,
  charge: (amount: number) => void,
) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > prefix.at(-1)!)
    fail("TYPE", path, "Expected an exact inline source offset within extent");
  let low = 0;
  let high = prefix.length;
  while (low + 1 < high) {
    charge(1);
    const middle = Math.floor((low + high) / 2);
    if (prefix[middle]! <= offset) low = middle;
    else high = middle;
  }
  return { index: low, offset: offset - prefix[low]! };
}
