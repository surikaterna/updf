import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { type DiagnosticCode, DocumentError } from "@updf/core";
import { prepareFont } from "@updf/fontkite";

export const fixture = async (weight = "Regular") =>
  new Uint8Array(
    await readFile(new URL(`../../../tests/fixtures/fonts/LiberationSans-${weight}.ttf`, import.meta.url)),
  );

export function entry(bytes: Uint8Array, tag: string): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < view.getUint16(4); i++) {
    const at = 12 + i * 16;
    if (String.fromCharCode(...bytes.subarray(at, at + 4)) === tag) return at;
  }
  throw new Error(`Missing fixture ${tag}`);
}

export function offset(bytes: Uint8Array, tag: string): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(entry(bytes, tag) + 8);
}

export function rejects(bytes: Uint8Array<ArrayBuffer>, code: DiagnosticCode = "FONT_FORMAT"): void {
  assert.throws(() => prepareFont(bytes), diagnostic(code));
}

export function diagnostic(code: DiagnosticCode = "FONT_FORMAT") {
  return (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code;
}
