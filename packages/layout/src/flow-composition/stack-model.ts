import { MetricSum } from "@updf/layout-boxes/arithmetic";

export interface StackChild {
  readonly extent: number;
  readonly control?: "advance";
  readonly naturalSize: { readonly height: number };
}
export interface StackEntry<Block> {
  readonly start: number;
  readonly end: number;
  readonly block?: Block;
  readonly space?: { readonly height: number; readonly capacity: number };
}
export interface Stack<Block> {
  readonly entries: readonly StackEntry<Block>[];
  readonly extent: number;
  readonly height: number;
}

export function stackHeight<Block extends StackChild>(children: readonly Block[], gap: number, blank = 0): number {
  const height = new MetricSum();
  let boxes = 0;
  for (const child of children) {
    if (!child.control && boxes++ > 0) height.add(gap);
    height.add(child.naturalSize.height);
  }
  height.add(blank);
  return height.value;
}

export function stack<Block extends StackChild>(
  children: readonly Block[],
  gap: number,
  blank: number,
  capacity: number,
  path: string,
  checkLimit: (value: number, maximum: number, path: string, unit: string) => number,
): Stack<Block> {
  const entries: StackEntry<Block>[] = [];
  let extent = 0,
    boxes = 0;
  const append = (block: Block | undefined, space?: StackEntry<Block>["space"]): void => {
    // Binary64 has at most 2098 significant dyadic bits: 40 terms suffice for an exact remainder.
    const count =
      block?.extent ?? (space?.height ? Math.ceil(space.height / Math.max(space.capacity, Number.MIN_VALUE)) + 42 : 1);
    const end = checkLimit(extent + count, Number.MAX_SAFE_INTEGER, path, "Block extent");
    entries.push({ start: extent, end, ...(block ? { block } : {}), ...(space ? { space } : {}) });
    extent = end;
  };
  for (const child of children) {
    if (!child.control && boxes++ > 0 && gap) {
      append(undefined, { height: gap, capacity: capacity > 0 ? capacity : gap });
    }
    append(child);
  }
  if (blank > 0 || !extent) {
    append(undefined, { height: blank, capacity: capacity > 0 ? capacity : Math.max(blank, 1) });
  }
  return { entries, extent, height: stackHeight(children, gap, blank) };
}
