import { data, profile, requireData } from "./errors.js";

export interface Segment {
  readonly marker: number;
  readonly payload: Uint8Array;
  readonly next: number;
}
export function word(bytes: Uint8Array, offset: number): number {
  requireData(offset >= 0 && offset + 2 <= bytes.length, "Truncated JPEG word");
  return (bytes[offset] ?? 0) * 256 + (bytes[offset + 1] ?? 0);
}
export function segment(bytes: Uint8Array, offset: number): Segment {
  requireData(bytes[offset] === 0xff, "Expected JPEG marker");
  let cursor = offset + 1;
  while (bytes[cursor] === 0xff) cursor++;
  const marker = bytes[cursor];
  requireData(marker !== undefined && marker !== 0, "Truncated or stuffed header marker");
  requireData(
    marker !== 0xd8 && marker !== 0xd9 && marker !== 0x01 && !(marker >= 0xd0 && marker <= 0xd7),
    "Unexpected standalone marker",
  );
  const length = word(bytes, cursor + 1);
  const next = cursor + 1 + length;
  requireData(length >= 2 && next <= bytes.length, "Invalid or truncated marker length");
  return { marker, payload: bytes.subarray(cursor + 3, next), next };
}

/** Structural framing only: no Huffman decoding or proof of MCU/restart interval validity. */
export function entropy(bytes: Uint8Array, offset: number, interval: number): void {
  let cursor = offset;
  let restart = 0;
  let nonempty = false;
  while (cursor < bytes.length) {
    if (bytes[cursor++] !== 0xff) {
      nonempty = true;
      continue;
    }
    const start = cursor;
    while (bytes[cursor] === 0xff) cursor++;
    const marker = bytes[cursor++];
    if (marker === 0) {
      requireData(cursor === start + 1, "Ambiguous repeated FF stuffing");
      nonempty = true;
      continue;
    }
    requireData(nonempty, "Empty entropy interval");
    if (marker === 0xd9) {
      requireData(cursor === bytes.length, "Trailing data after EOI");
      return;
    }
    if (marker !== undefined && marker >= 0xd0 && marker <= 0xd7) {
      requireData(interval > 0 && marker === 0xd0 + restart, "Invalid restart sequence or disabled DRI");
      restart = (restart + 1) % 8;
      nonempty = false;
      continue;
    }
    if (marker === 0xda) profile("Multiscan JPEG is unsupported");
    data("Unexpected or truncated entropy marker");
  }
  data("Missing terminal EOI");
}
