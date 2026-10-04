import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { Projection, Rect } from "../src/projection.js";
import { artifactDirectory } from "./pdf-tools.js";

export function assertAtomicRaster(projection: Projection, name: string): void {
  const pageIndex = projection.pages.findIndex((page) => page.rectangles.some((rect) => rect.id === "atomic-row"));
  const page = projection.pages[pageIndex];
  assert.ok(page);
  const directory = artifactDirectory();
  rasterize(directory, name, pageIndex + 1);
  const ppm = readFileSync(`${directory}${name}-atomic.ppm`);
  const header = /^P6\s+(\d+)\s+(\d+)\s+255\s/u.exec(ppm.subarray(0, 80).toString("ascii"));
  assert.ok(header);
  const width = Number(header[1]),
    height = Number(header[2]);
  assert.equal(width, page.width);
  assert.equal(height, page.height);
  const pixels = ppm.subarray(header[0].length);
  const painted = (x: number, y: number) => {
    const offset = (Math.floor(y) * width + Math.floor(x)) * 3;
    return (pixels[offset] ?? 255) < 100 && (pixels[offset + 1] ?? 255) < 130 && (pixels[offset + 2] ?? 255) < 200;
  };
  for (const rect of page.rectangles) assertEdges(rect, painted);
  const row = page.rectangles.find((rect) => rect.id === "atomic-row");
  assert.ok(row);
  const lastLine = page.lines.at(-1);
  if (lastLine) assert.ok(lastLine.y + lastLine.line.height <= row.y);
}

function rasterize(directory: string, name: string, pageNumber: number): void {
  execFileSync("pdftoppm", [
    "-r",
    "72",
    "-aa",
    "no",
    "-aaVector",
    "no",
    "-f",
    String(pageNumber),
    "-l",
    String(pageNumber),
    "-singlefile",
    `${directory}${name}.pdf`,
    `${directory}${name}-atomic`,
  ]);
  execFileSync("pdftoppm", [
    "-f",
    String(pageNumber),
    "-l",
    String(pageNumber),
    "-singlefile",
    "-scale-to",
    "900",
    "-png",
    `${directory}${name}.pdf`,
    `${directory}${name}-atomic-view`,
  ]);
}

function assertEdges(rect: Rect, painted: (x: number, y: number) => boolean): void {
  const points = [
    [rect.x + rect.width / 2, rect.y],
    [rect.x + rect.width / 2, rect.y + rect.height],
    [rect.x, rect.y + rect.height / 2],
    [rect.x + rect.width, rect.y + rect.height / 2],
  ];
  for (const [x = 0, y = 0] of points) {
    assert.ok(
      [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => painted(x + dx, y + dy))),
      `${rect.id} has no actual PDF edge at accepted (${x},${y})`,
    );
  }
}
