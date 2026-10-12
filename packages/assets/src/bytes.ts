import { fail } from "./errors.js";
export { AssetError } from "./errors.js";

const Bytes = Uint8Array,
  isView = ArrayBuffer.isView;
const typed = Object.getPrototypeOf(Bytes.prototype);
const kind = Object.getOwnPropertyDescriptor(typed, Symbol.toStringTag)!.get!;
const length = Object.getOwnPropertyDescriptor(typed, "byteLength")!.get!;
const offset = Object.getOwnPropertyDescriptor(typed, "byteOffset")!.get!;
const backing = Object.getOwnPropertyDescriptor(typed, "buffer")!.get!;
const ordinaryLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength")!.get!;
const set = Bytes.prototype.set;

/** Copy a genuine attached, non-shared Uint8Array without running caller property overrides. */
export function copyBytes(source: Uint8Array, maximum: number): Uint8Array<ArrayBuffer> {
  if (!Number.isSafeInteger(maximum) || maximum < 0)
    fail("VALUE", "/options/maxBytes", "Expected a nonnegative safe integer byte limit");
  if (!isView(source) || kind.call(source) !== "Uint8Array") fail("TYPE", "/source", "Expected non-shared Uint8Array");
  const buffer = backing.call(source);
  try {
    ordinaryLength.call(buffer);
  } catch {
    fail("TYPE", "/source", "Expected non-shared Uint8Array");
  }
  const size = length.call(source);
  if (size > maximum) fail("LIMIT", "/source", "Asset byte limit exceeded");
  const result = new Bytes(size);
  try {
    set.call(result, new Bytes(buffer, offset.call(source), size));
  } catch {
    fail("TYPE", "/source", "Expected attached Uint8Array storage");
  }
  return result;
}
