import { deflateSync } from "node:zlib";
import { chunk, container, header } from "../../png/test/helpers.js";
import type { PngShape } from "@updf/text-flow/png-shape";

export function alphaPng(width: number, height: number, alpha: readonly number[]): Uint8Array {
  const rows = Buffer.alloc((1 + width * 2) * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) rows[y * (1 + width * 2) + 2 + x * 2] = alpha[y * width + x]!;
  }
  return container(header(4, width, height), chunk("IDAT", deflateSync(rows)), chunk("IEND"));
}

export function rectangles(shape: PngShape): readonly { left: number; right: number; top: number; bottom: number }[] {
  if (shape.kind === "empty") return [];
  const result = [];
  for (let i = 0; i < shape.commands.length; i += 5) {
    const a = shape.commands[i]!,
      b = shape.commands[i + 2]!;
    if (a.type !== "move" || b.type !== "line") throw new Error("Expected rectangles");
    result.push({ left: a.x, top: a.y, right: b.x, bottom: b.y });
  }
  return result;
}
