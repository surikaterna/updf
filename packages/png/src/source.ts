import { DocumentError } from "@updf/core";
import { limit, requireData } from "./errors.js";

const Bytes = Uint8Array;
const isView = ArrayBuffer.isView;
const typedArray = Object.getPrototypeOf(Bytes.prototype);
const kind = Object.getOwnPropertyDescriptor(typedArray, Symbol.toStringTag)?.get;
const length = Object.getOwnPropertyDescriptor(typedArray, "byteLength")?.get;
const offset = Object.getOwnPropertyDescriptor(typedArray, "byteOffset")?.get;
const buffer = Object.getOwnPropertyDescriptor(typedArray, "buffer")?.get;
const bufferLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength")?.get;
const set = Bytes.prototype.set;
export const PNG_SOURCE_LIMIT = 8 * 1024 * 1024;

function requireOrdinaryBuffer(backing: ArrayBuffer): void {
  try {
    bufferLength?.call(backing);
  } catch {
    throw new DocumentError("TYPE", "/source", "Expected non-shared Uint8Array");
  }
}

/** Intrinsics avoid executing caller overrides while copying the input view. */
export function sourceBytes(source: Uint8Array): Uint8Array {
  if (!isView(source) || kind?.call(source) !== "Uint8Array")
    throw new DocumentError("TYPE", "/source", "Expected non-shared Uint8Array");
  const backing = buffer?.call(source);
  requireOrdinaryBuffer(backing);
  const size = length?.call(source);
  if (size > PNG_SOURCE_LIMIT) limit("PNG source exceeds 8 MiB");
  requireData(size >= 8, "PNG source is too short");
  const copy = new Bytes(size);
  set.call(copy, new Bytes(backing, offset?.call(source), size));
  return copy;
}
