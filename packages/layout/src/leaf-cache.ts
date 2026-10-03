import type { TextMeasurement } from "@updf/core/measurement";
import type { AdapterOrigin } from "./adapter-call.js";
import type { MeasuredBlock } from "./extension-types.js";

export interface ExtensionMeasurement {
  readonly measured: MeasuredBlock;
  readonly origin: AdapterOrigin;
}
export interface LeafCache {
  readonly paragraphs: WeakMap<object, Map<number, TextMeasurement>>;
  readonly extensions: WeakMap<object, Map<string, ExtensionMeasurement>>;
}
export function leafCache(): LeafCache {
  return { paragraphs: new WeakMap(), extensions: new WeakMap() };
}
const operations = new WeakMap<object, LeafCache>();
export function operationLeafCache(operation: object): LeafCache {
  const cache = operations.get(operation) ?? leafCache();
  operations.set(operation, cache);
  return { paragraphs: new WeakMap(), extensions: cache.extensions };
}
