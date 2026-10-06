import { profile, requireData } from "./errors.js";

export function quantization(bytes: Uint8Array, tables: Set<number>): void {
  requireData(bytes.length > 0, "Empty DQT");
  let cursor = 0;
  while (cursor < bytes.length) {
    const descriptor = bytes[cursor++] ?? 0;
    if (descriptor >> 4 !== 0) profile("Only 8-bit quantization is supported");
    const id = descriptor & 15;
    requireData(id <= 3 && !tables.has(id), "Invalid or duplicate quantization table");
    requireData(cursor + 64 <= bytes.length, "Truncated quantization table");
    const values = bytes.subarray(cursor, cursor + 64);
    requireData(
      values.every((value) => value !== 0),
      "Zero quantization entry",
    );
    cursor += 64;
    tables.add(id);
  }
}
export function huffman(bytes: Uint8Array, tables: Set<number>): void {
  requireData(bytes.length > 0, "Empty DHT");
  let cursor = 0;
  while (cursor < bytes.length) {
    const descriptor = bytes[cursor++] ?? 0;
    const kind = descriptor >> 4;
    requireData(kind <= 1 && (descriptor & 15) <= 3 && !tables.has(descriptor), "Invalid or duplicate Huffman table");
    requireData(cursor + 16 <= bytes.length, "Truncated Huffman counts");
    const counts = bytes.subarray(cursor, cursor + 16);
    const count = counts.reduce((sum, value) => sum + value, 0);
    cursor += 16;
    requireData(count > 0 && count <= 256 && cursor + count <= bytes.length, "Invalid Huffman symbol count");
    tree(counts);
    symbols(bytes.subarray(cursor, cursor + count), kind);
    cursor += count;
    tables.add(descriptor);
  }
}
function tree(counts: Uint8Array): void {
  let available = 1;
  for (const count of counts) {
    available = available * 2 - count;
    // A complete tree assigns an all-ones code, forbidden by JPEG padding rules.
    requireData(available > 0, "Oversubscribed Huffman tree or all-ones code");
  }
}
function symbols(values: Uint8Array, kind: number): void {
  requireData(new Set(values).size === values.length, "Duplicate Huffman symbols");
  for (const value of values) {
    const valid = kind === 0 ? value <= 11 : value === 0 || value === 0xf0 || ((value & 15) >= 1 && (value & 15) <= 10);
    requireData(valid, "Invalid baseline Huffman symbol");
  }
}
