import { DocumentError } from "@updf/core";

export function data(message: string): never {
  throw new DocumentError("PNG_DATA", "/source", message);
}
export function profile(message: string): never {
  throw new DocumentError("PNG_PROFILE", "/source", message);
}
export function limit(message: string): never {
  throw new DocumentError("LIMIT", "/source", message);
}
export function requireData(condition: unknown, message: string): asserts condition {
  if (!condition) data(message);
}
