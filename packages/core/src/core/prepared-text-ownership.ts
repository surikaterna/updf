// Independent of snapshot/validation to keep the opaque identity check acyclic.
const payloads = new WeakSet<object>();
export function authorizePreparedText(value: object): void {
  payloads.add(value);
}
export function isPreparedTextPayload(value: unknown): value is object {
  return !!value && typeof value === "object" && payloads.has(value);
}
