import type { Grid } from "./functions.js";

function pair(grid: Grid, words: Uint8Array, right: number, y: number, bit: number): number {
  for (let dx = 0; dx < 2; dx++) {
    const at = y * grid.size + right - dx;
    if (grid.fixed[at]) continue;
    grid.cells[at] = ((words[bit >>> 3] ?? 0) >>> (7 - (bit & 7))) & 1;
    bit++;
  }
  return bit;
}

export function place(grid: Grid, words: Uint8Array): void {
  let upward = true,
    bit = 0;
  for (let right = grid.size - 1; right >= 1; right -= 2) {
    if (right === 6) right--;
    for (let step = 0; step < grid.size; step++)
      bit = pair(grid, words, right, upward ? grid.size - 1 - step : step, bit);
    upward = !upward;
  }
  if (bit < words.length * 8 || bit - words.length * 8 > 7) throw new Error("Invalid QR placement capacity");
}

export function maskBit(mask: number, x: number, y: number): boolean {
  const product = x * y;
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5:
      return (product % 2) + (product % 3) === 0;
    case 6:
      return ((product % 2) + (product % 3)) % 2 === 0;
    case 7:
      return (((x + y) % 2) + (product % 3)) % 2 === 0;
    default:
      throw new RangeError("Invalid QR mask");
  }
}

export function applyMask(grid: Grid, mask: number): void {
  for (let y = 0; y < grid.size; y++)
    for (let x = 0; x < grid.size; x++) {
      const at = y * grid.size + x;
      if (!grid.fixed[at] && maskBit(mask, x, y)) grid.cells[at] = grid.cells[at]! ^ 1;
    }
}
