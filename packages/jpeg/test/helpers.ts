import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DocumentError, type DiagnosticCode, type DocumentDefinition } from "@updf/core";

export function document(resource = "photo"): DocumentDefinition {
  return {
    version: 1,
    pages: [
      { width: 100, height: 100, children: [{ type: "xObject", resource, x: 10, y: 20, width: 60, height: 40 }] },
    ],
  };
}

export function fixture(name = "color-1x1"): Uint8Array {
  return new Uint8Array(readFileSync(new URL(`../../../tests/fixtures/jpeg/${name}.jpg`, import.meta.url)));
}
export function failure(callback: () => unknown, code: DiagnosticCode, path = "/source"): void {
  assert.throws(
    callback,
    (error: unknown) =>
      error instanceof DocumentError && error.diagnostics[0]?.code === code && error.diagnostics[0]?.path === path,
  );
}
export function segment(marker: number, payload: readonly number[]): number[] {
  const length = payload.length + 2;
  return [0xff, marker, length >> 8, length & 255, ...payload];
}
export function synthetic(options: { entropy?: number[]; interval?: number; jfif?: boolean } = {}): Uint8Array {
  const app0 = options.jfif ? segment(0xe0, [74, 70, 73, 70, 0, 1, 2, 0, 0, 1, 0, 1, 0, 0]) : [];
  const dri = options.interval === undefined ? [] : segment(0xdd, [options.interval >> 8, options.interval & 255]);
  return Uint8Array.from([
    0xff,
    0xd8,
    ...app0,
    ...segment(0xdb, [0, ...Array<number>(64).fill(1)]),
    ...segment(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]),
    ...segment(0xc4, [0, 1, ...Array<number>(15).fill(0), 0, 0x10, 1, ...Array<number>(15).fill(0), 0]),
    ...dri,
    ...segment(0xda, [1, 1, 0, 0, 63, 0]),
    ...(options.entropy ?? [0x42]),
    0xff,
    0xd9,
  ]);
}
export function markerOffset(bytes: Uint8Array, marker: number): number {
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset + 1] === marker) return offset;
    offset += 2 + (bytes[offset + 2] ?? 0) * 256 + (bytes[offset + 3] ?? 0);
  }
  throw new Error(`Missing marker ${marker}`);
}
export function change(bytes: Uint8Array, marker: number, payloadOffset: number, value: number): Uint8Array {
  const copy = new Uint8Array(bytes);
  copy[markerOffset(copy, marker) + 4 + payloadOffset] = value;
  return copy;
}
export function insert(bytes: Uint8Array, marker: number, payload: number[], offset = 2): Uint8Array {
  return Uint8Array.from([...bytes.subarray(0, offset), ...segment(marker, payload), ...bytes.subarray(offset)]);
}
