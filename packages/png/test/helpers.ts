import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { DocumentError, type DocumentDefinition } from "@updf/core";
import { png } from "@updf/png";

export function chunk(type: string, bytes: Uint8Array = new Uint8Array()): Buffer {
  const result = Buffer.alloc(bytes.length + 12);
  result.writeUInt32BE(bytes.length);
  result.write(type, 4, "ascii");
  result.set(bytes, 8);
  let crc = 0xffffffff;
  for (const byte of result.subarray(4, -4)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, result.length - 4);
  return result;
}

export function header(color = 6, width = 2, height = 2, depth = 8, interlace = 0): Buffer {
  const bytes = Buffer.alloc(13);
  bytes.writeUInt32BE(width);
  bytes.writeUInt32BE(height, 4);
  bytes[8] = depth;
  bytes[9] = color;
  bytes[12] = interlace;
  return chunk("IHDR", bytes);
}
export function container(...chunks: Uint8Array[]): Buffer {
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ...chunks]);
}
export function fixture(
  color = 6,
  samples = [255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0, 255, 255, 0, 255],
  extras: Buffer[] = [],
): Buffer {
  const half = samples.length / 2;
  const rows = Buffer.from([0, ...samples.slice(0, half), 0, ...samples.slice(half)]);
  return container(header(color), ...extras, chunk("IDAT", deflateSync(rows)), chunk("IEND"));
}
export function document(id = "image"): DocumentDefinition {
  return {
    version: 1,
    pages: [{ width: 100, height: 100, children: [png(id, { x: 10, y: 20, width: 60, height: 40 })] }],
  };
}
export function failure(run: () => unknown, code: string): void {
  assert.throws(run, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code);
}
export async function rejection(run: () => Promise<unknown>, code: string): Promise<void> {
  await assert.rejects(run, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code);
}
