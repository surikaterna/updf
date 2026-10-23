import { dataArray, dataRecord, fail } from "@updf/core/internal";

declare const slotBrand: unique symbol;
export interface FragmentSlot<T extends object> {
  readonly [slotBrand]: (value: T) => T;
}
let slots: WeakSet<object> | undefined;
/** One slot per producer; its single immutable checkpoint replaces, rather than appends, history. */
export function fragmentSlot<T extends object>(): FragmentSlot<T> {
  const slot = Object.freeze({}) as FragmentSlot<T>;
  slots ??= new WeakSet();
  slots.add(slot);
  return slot;
}
export function checkFragmentSlot(slot: object): void {
  if (!slots?.has(slot)) fail("MEASUREMENT_CONTEXT", "", "Expected an owned fragment state slot");
}
export function checkFragmentCheckpoint(value: object): void {
  if (!value || typeof value !== "object") fail("TYPE", "", "Expected frozen fragment checkpoint data");
  const pending: unknown[] = [value];
  const seen = new Set<object>();
  while (pending.length) {
    const item = pending.pop();
    if (typeof item === "function" || typeof item === "symbol")
      fail("TYPE", "", "Fragment checkpoints cannot retain executable or symbol values");
    if (!item || typeof item !== "object") continue;
    if (seen.has(item)) continue;
    seen.add(item);
    if (!Object.isFrozen(item)) fail("TYPE", "", "Expected frozen fragment checkpoint data");
    if (Array.isArray(item)) dataArray(item, "");
    else dataRecord(item, "");
    // The shared descriptor validators reject getters/symbol keys before any value read.
    for (const child of Object.values(item)) pending.push(child);
  }
}
