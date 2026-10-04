import { intervals } from "./intervals.js";
import { ascii, type ProofSnapshot, rows, windowSize } from "./profile.js";

export function wrap(text: string, width: number): string[] {
  ascii(text);
  if (!Number.isInteger(width) || width < 1) throw new Error("Positive integer wrap width required");
  return text.split("\n").flatMap((paragraph) => {
    const lines: string[] = [];
    let rest = paragraph;
    while (rest.length > width) {
      const space = rest.lastIndexOf(" ", width - 1);
      const cut = space < 0 ? width : space + 1;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    lines.push(rest);
    return lines;
  });
}
interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly lines: readonly string[];
}

function place(texts: readonly string[], width: number, y: number): Box[] {
  const tracks =
    texts.length === 2
      ? [
          { weight: 1, min: 8, max: 24 },
          { weight: 2, min: 12, max: 100 },
        ]
      : [width];
  return intervals(width, tracks).boxes.map((box, index) => ({
    x: box.start,
    y,
    width: box.width,
    lines: wrap(texts[index] ?? "", box.width),
  }));
}

function raster(boxes: readonly Box[], width: number, height: number): string {
  const buffer = Array.from({ length: height }, () => Array<string>(width).fill(" "));
  const occupied = new Set<number>();
  for (const box of boxes) {
    if (box.x < 0 || box.y < 0 || box.x + box.width > width || box.y + box.lines.length > height)
      throw new Error("Bounds overflow; clipping is forbidden");
    box.lines.forEach((line, dy) => {
      if (line.length > box.width) throw new Error("Line overflow");
      for (let dx = 0; dx < box.width; dx++) {
        const cell = (box.y + dy) * width + box.x + dx;
        if (occupied.has(cell)) throw new Error("Overlapping boxes");
        occupied.add(cell);
        const row = buffer[box.y + dy];
        if (row) row[box.x + dx] = line[dx] ?? " ";
      }
    });
  }
  return buffer.map((line) => line.join("")).join("\n");
}

export function render(snapshot: ProofSnapshot, width: number, height = 20, footer = "STATIC / cell units") {
  windowSize(width, height);
  const content = rows(snapshot, footer);
  const boxes: Box[] = [];
  let y = 0;
  for (const row of content) {
    const placed = place(row.texts, width, y);
    boxes.push(...placed);
    y += Math.max(...placed.map((box) => box.lines.length));
  }
  const border = `+${"-".repeat(width - 2)}+`;
  const footerLines = [border, ...wrap(footer, width - 2).map((line) => `|${line.padEnd(width - 2)}|`), border];
  const full = intervals(width, [width]).boxes[0];
  if (!full) throw new Error("Missing footer interval");
  boxes.push({ x: full.start, y, width: full.width, lines: footerLines });
  if (y + footerLines.length > height) throw new Error("Bounds overflow; clipping is forbidden");
  return Object.freeze({
    body: raster(boxes, width, y + footerLines.length),
    boxes: Object.freeze(boxes),
    order: content.map((row) => row.id),
  });
}
