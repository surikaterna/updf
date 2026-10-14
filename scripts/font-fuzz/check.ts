import { createHash } from "node:crypto";
import { DocumentError } from "@updf/core";
import { prepareFont } from "@updf/fontkite";
import type { PreparedFont } from "@updf/fonts";

export const hash = (bytes: Uint8Array | string): string => createHash("sha256").update(bytes).digest("hex");
export interface Outcome {
  readonly status: "accepted" | "rejected" | "finding";
  readonly code?: string;
  readonly message?: string;
}
function repeated(bytes: Uint8Array<ArrayBuffer>, expected: string, prepare: typeof prepareFont): Outcome {
  const padded = new Uint8Array(bytes.length + 13);
  padded.set(bytes, 7);
  try {
    const again = prepare(padded.subarray(7, -6));
    if (hash(JSON.stringify(again.metadata)) !== expected)
      return { status: "finding", message: "Subview/determinism mismatch" };
    if (hash(padded.subarray(7, -6)) !== hash(bytes))
      return { status: "finding", message: "Subview input was mutated" };
    return { status: "accepted" };
  } catch (error) {
    return { status: "finding", message: `Accepted input rejected on repeat: ${String(error)}`.slice(0, 1500) };
  }
}
export function check(bytes: Uint8Array<ArrayBuffer>, baselineDigest?: string, prepare = prepareFont): Outcome {
  const before = hash(bytes);
  let font: PreparedFont;
  try {
    font = prepare(bytes);
  } catch (error) {
    if (hash(bytes) !== before) return { status: "finding", message: "Rejected input was mutated" };
    if (error instanceof DocumentError && !baselineDigest) {
      const diagnostic = error.diagnostics[0];
      if (diagnostic && typeof diagnostic.code === "string" && typeof diagnostic.message === "string")
        return { status: "rejected", code: diagnostic.code };
    }
    return {
      status: "finding",
      message: `${baselineDigest ? "Valid control rejected" : "Unstructured parser error"}: ${String(error)}`.slice(
        0,
        1500,
      ),
    };
  }
  if (hash(bytes) !== before) return { status: "finding", message: "Accepted input was mutated" };
  const digest = hash(JSON.stringify(font.metadata));
  if (baselineDigest && digest !== baselineDigest)
    return { status: "finding", message: "Valid control metadata changed after prior cases" };
  return repeated(bytes, digest, prepare);
}
