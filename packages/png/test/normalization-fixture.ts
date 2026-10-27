import { deflateSync } from "node:zlib";
import { chunk, container, header } from "./helpers.js";

export function rows16(color = 6, filters = [0, 1, 2, 3, 4]): Buffer {
  const channels = ({ 0: 1, 2: 3, 4: 2, 6: 4 } as Record<number, number>)[color]!;
  return Buffer.from(
    filters.flatMap((filter) => [filter, ...Array.from({ length: channels * 4 }, (_, i) => (i * 37) & 255)]),
  );
}

export function png16(color = 6, extras: Uint8Array[] = [], rows = rows16(color)): Buffer {
  return container(header(color, 2, 5, 16), ...extras, chunk("IDAT", deflateSync(rows)), chunk("IEND"));
}

export async function withCodec(
  name: "DecompressionStream" | "CompressionStream",
  value: unknown,
  run: () => Promise<void>,
): Promise<void> {
  const original = Object.getOwnPropertyDescriptor(globalThis, name)!;
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  try {
    await run();
  } finally {
    Object.defineProperty(globalThis, name, original);
  }
}
