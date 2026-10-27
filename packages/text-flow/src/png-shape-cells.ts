import { DocumentError } from "@updf/core";
import type { PathCommand } from "@updf/core/painting";
import type { PngAlpha } from "@updf/png/alpha";
import { checkShapeAbort, type ShapeOptions } from "./png-shape-options.js";

interface Rectangle {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  bottom: number;
}
interface Scan {
  readonly commands: PathCommand[];
  readonly capacity: number;
  retained: number;
}

function rectangle(scan: Scan, box: Rectangle): void {
  scan.commands.push(
    Object.freeze({ type: "move", x: box.left, y: box.top }),
    Object.freeze({ type: "line", x: box.right, y: box.top }),
    Object.freeze({ type: "line", x: box.right, y: box.bottom }),
    Object.freeze({ type: "line", x: box.left, y: box.bottom }),
    Object.freeze({ type: "close" }),
  );
}

function retain(scan: Scan, left: number, right: number, y: number): Rectangle {
  // Every active rectangle must eventually emit five commands. Charge before retaining it.
  if (scan.retained >= scan.capacity)
    throw new DocumentError("LIMIT", "/options/maxCommands", "PNG shape exceeds command budget");
  scan.retained++;
  return { left, right, top: y, bottom: y + 1 };
}

function rowRuns(
  bytes: Uint8Array,
  width: number,
  y: number,
  occupied: readonly boolean[],
  previous: Map<string, Rectangle>,
  scan: Scan,
): Map<string, Rectangle> {
  const current = new Map<string, Rectangle>();
  let x = 0;
  while (x < width) {
    if (!occupied[bytes[y * width + x]!]!) {
      x++;
      continue;
    }
    const left = x++;
    while (x < width && occupied[bytes[y * width + x]!]!) x++;
    const key = `${left}:${x}`;
    const box = previous.get(key) ?? retain(scan, left, x, y);
    previous.delete(key);
    box.bottom = y + 1;
    current.set(key, box);
  }
  for (const box of previous.values()) rectangle(scan, box);
  return current;
}

export function pixelCellCommands(plane: PngAlpha, options: ShapeOptions): readonly PathCommand[] {
  const scan: Scan = { commands: [], capacity: Math.floor(options.maxCommands / 5), retained: 0 };
  const { width, height } = plane;
  // Classification is the exact declared binary64 division/comparison, not threshold * 255.
  const occupied = Array.from({ length: 256 }, (_, alpha) => alpha / 255 > options.shapeImageThreshold);
  if (plane.kind === "opaque") {
    if (occupied[255]) rectangle(scan, { ...retain(scan, 0, width, 0), bottom: height });
    return Object.freeze(scan.commands);
  }
  let active = new Map<string, Rectangle>();
  for (let y = 0; y < height; y++) {
    checkShapeAbort(options.signal);
    active = rowRuns(plane.bytes, width, y, occupied, active, scan);
  }
  for (const box of active.values()) rectangle(scan, box);
  return Object.freeze(scan.commands);
}
