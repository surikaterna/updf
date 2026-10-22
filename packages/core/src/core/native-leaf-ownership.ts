// Independent of snapshot/validation to keep the opaque identity check acyclic.
const payloads = new WeakSet<object>();
export function authorizeNativeLeaf(value: object): void {
  payloads.add(value);
}
export function isNativeLeafPayload(value: unknown): value is object {
  return !!value && typeof value === "object" && payloads.has(value);
}
