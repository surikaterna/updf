import { DocumentError, fail } from "@updf/core/internal";

export interface AdapterOrigin {
  path: string;
}
function structured(error: unknown): boolean {
  try {
    return error instanceof DocumentError;
  } catch {
    return false;
  }
}
export function adapterCall<T>(
  stage: "validate" | "measure" | "fragment",
  path: string,
  callback: () => T,
  origin: AdapterOrigin,
): T {
  const previous = origin.path;
  origin.path = path;
  try {
    return callback();
  } catch (error) {
    if (structured(error)) throw error;
    // Thrown values are untrusted data too: do not invoke message/toString/getter code.
    fail("TYPE", path, `Block adapter ${stage} callback failed`);
  } finally {
    origin.path = previous;
  }
}
