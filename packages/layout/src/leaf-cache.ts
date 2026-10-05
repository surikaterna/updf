import type { TextMeasurement } from "@updf/text";
import type { AdapterOrigin } from "./adapter-call.js";
import type { ExtensionLifetime } from "./extension-producer.js";
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
// Measured callbacks capture their invocation lifetime, including in nested reservation trials.
const lifetimes = new WeakMap<ExtensionLifetime, LeafCache>();
export function lifetimeLeafCache(lifetime: ExtensionLifetime): LeafCache {
  const cache = lifetimes.get(lifetime) ?? leafCache();
  lifetimes.set(lifetime, cache);
  return { paragraphs: new WeakMap(), extensions: cache.extensions };
}
