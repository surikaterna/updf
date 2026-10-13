import type { Level } from "./profile.js";

export interface Grid {
  size: number;
  cells: Uint8Array;
  fixed: Uint8Array;
}

function set(grid: Grid, x: number, y: number, bit: number): void {
  if (x < 0 || y < 0 || x >= grid.size || y >= grid.size) return;
  const index = y * grid.size + x;
  grid.cells[index] = bit;
  grid.fixed[index] = 1;
}

function square(grid: Grid, cx: number, cy: number, radius: number): void {
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const distance = Math.max(Math.abs(x), Math.abs(y));
      const dark = radius === 4 ? distance !== 2 && distance !== 4 : distance !== 1;
      set(grid, cx + x, cy + y, Number(dark));
    }
  }
}

function bch(value: number, polynomial: number, degree: number): number {
  let remainder = value << degree;
  for (let bit = 31 - Math.clz32(remainder); bit >= degree; bit--)
    if ((remainder >>> bit) & 1) remainder ^= polynomial << (bit - degree);
  return (value << degree) | remainder;
}

export function format(grid: Grid, level: Level, mask: number): void {
  const bits = bch(((level === "H" ? 2 : 0) << 3) | mask, 0x537, 10) ^ 0x5412;
  const bit = (i: number) => (bits >>> i) & 1;
  for (let i = 0; i < 6; i++) set(grid, 8, i, bit(i));
  set(grid, 8, 7, bit(6));
  set(grid, 8, 8, bit(7));
  set(grid, 7, 8, bit(8));
  for (let i = 9; i < 15; i++) set(grid, 14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) set(grid, grid.size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) set(grid, 8, grid.size - 15 + i, bit(i));
  set(grid, 8, grid.size - 8, 1);
}

function versionBits(grid: Grid, version: number): void {
  if (version < 7) return;
  const bits = bch(version, 0x1f25, 12);
  for (let i = 0; i < 18; i++) {
    const x = grid.size - 11 + (i % 3),
      y = Math.floor(i / 3),
      bit = (bits >>> i) & 1;
    set(grid, x, y, bit);
    set(grid, y, x, bit);
  }
}

function align(grid: Grid, version: number): void {
  if (version === 1) return;
  const last = grid.size - 7;
  const centers = version < 7 ? [6, last] : [6, version * 2 + 8, last];
  for (const y of centers)
    for (const x of centers) {
      if ((x === 6 && (y === 6 || y === last)) || (x === last && y === 6)) continue;
      square(grid, x, y, 2);
    }
}

export function functionGrid(version: number, level: Level): Grid {
  const size = 17 + version * 4;
  const grid = { size, cells: new Uint8Array(size * size), fixed: new Uint8Array(size * size) };
  for (let i = 0; i < size; i++) {
    set(grid, 6, i, Number(i % 2 === 0));
    set(grid, i, 6, Number(i % 2 === 0));
  }
  square(grid, 3, 3, 4);
  square(grid, size - 4, 3, 4);
  square(grid, 3, size - 4, 4);
  align(grid, version);
  format(grid, level, 0);
  versionBits(grid, version);
  return grid;
}
