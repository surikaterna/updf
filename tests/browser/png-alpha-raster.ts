import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface AlphaProof {
  plane: { width: number; height: number; alpha: number[] | null };
  results: { threshold: number; textPdf: number[]; rects: Rect[] }[];
}
export function assertAlphaClearance(proof: AlphaProof) {
  for (const row of proof.results) {
    let red = 0;
    for (const [page, rect] of row.rects.entries()) {
      const ppm = execFileSync(
        "pdftoppm",
        ["-f", String(page + 1), "-l", String(page + 1), "-r", "144", "-singlefile", "-"],
        { input: Buffer.from(row.textPdf), maxBuffer: 8 * 1024 * 1024 },
      );
      red += checkRaster(ppm, rect, proof.plane, row.threshold);
    }
    assert.ok(red > 100);
  }
}
function checkRaster(ppm: Buffer, rect: Rect, plane: AlphaProof["plane"], threshold: number) {
  const header = /^P6\s+(\d+)\s+(\d+)\s+255\s/u.exec(ppm.toString("ascii", 0, 40))!;
  assert.ok(header);
  let red = 0;
  for (let pixel = 0; pixel < Number(header[1]) * Number(header[2]); pixel++) {
    const at = header[0].length + pixel * 3;
    if (ppm[at]! < 100 || ppm[at + 1]! > 40 || ppm[at + 2]! > 40) continue;
    red++;
    const x = ((pixel % Number(header[1])) + 0.5) / 2,
      y = (Math.floor(pixel / Number(header[1])) + 0.5) / 2;
    const col = Math.floor(((x - rect.x) * plane.width) / rect.width),
      line = Math.floor(((y - rect.y) * plane.height) / rect.height);
    if (col < 0 || col >= plane.width || line < 0 || line >= plane.height) continue;
    assert.ok(
      (plane.alpha?.[line * plane.width + col] ?? 255) / 255 <= threshold,
      `occupied alpha cell intersects native text at ${x},${y}, threshold ${threshold}`,
    );
  }
  return red;
}
