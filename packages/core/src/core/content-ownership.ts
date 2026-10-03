import { isPreparedFont } from "../fonts/prepare.js";
import { dataArray, dataRecord } from "./data.js";
import { fail } from "./error.js";
import { isExecutableNode } from "./node-ownership.js";

const content = new WeakSet<object>();
declare const contentBrand: unique symbol;
export interface ContentHandle {
  readonly [contentBrand]: true;
}

/** Internal immutable authoring capabilities, never accepted as context values. */
export function ownContentData<T extends object>(value: T): T & ContentHandle {
  immutableData(value);
  content.add(value);
  return value as T & ContentHandle;
}
function immutableData(value: unknown): void {
  const seen = new Set<object>(),
    active = new Set<object>(),
    tasks: (() => void)[] = [];
  const visit = (item: unknown): void => {
    if (opaqueOrPrimitive(item)) return;
    if (item === null || typeof item !== "object")
      fail("TYPE", "/content", "Content capabilities cannot contain callbacks");
    if (active.has(item)) fail("VDOM_CYCLE", "/content", "Cyclic content capability");
    if (seen.has(item)) return;
    if (!Object.isFrozen(item)) fail("TYPE", "/content", "Content capabilities require deeply immutable data");
    if (Array.isArray(item)) dataArray(item, "/content");
    else dataRecord(item, "/content");
    active.add(item);
    tasks.push(() => {
      active.delete(item);
      seen.add(item);
    });
    for (const child of Object.values(item).reverse()) tasks.push(() => visit(child));
  };
  visit(value);
  while (tasks.length) tasks.pop()?.();
}
function opaqueOrPrimitive(item: unknown): boolean {
  return (
    isPreparedFont(item) ||
    isContentData(item) ||
    isExecutableNode(item) ||
    item == null ||
    ["string", "number", "boolean", "undefined"].includes(typeof item)
  );
}
export function isContentData(value: unknown): value is object {
  return !!value && typeof value === "object" && content.has(value);
}
