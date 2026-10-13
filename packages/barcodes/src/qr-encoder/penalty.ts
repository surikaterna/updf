function linePenalty(line: Uint8Array): number {
  let score = 0,
    run = 0,
    previous = -1,
    pattern = 0;
  for (let i = 0; i < line.length; i++) {
    const bit = line[i]!;
    run = bit === previous ? run + 1 : 1;
    previous = bit;
    if (run >= 5) score += run === 5 ? 3 : 1;
    pattern = ((pattern << 1) | bit) & 127;
    if (i >= 6 && pattern === 0b1011101) {
      const before = line.subarray(Math.max(0, i - 10), i - 6);
      const after = line.subarray(i + 1, i + 5);
      if (!before.some(Boolean) || !after.some(Boolean)) score += 40;
    }
  }
  return score;
}

/** Four mask penalties, including function/format modules; exterior quiet zone is light. */
export function penalty(cells: Uint8Array, size: number): number {
  let score = 0,
    dark = 0;
  for (let y = 0; y < size; y++) {
    const row = cells.subarray(y * size, (y + 1) * size);
    const column = Uint8Array.from({ length: size }, (_, x) => cells[x * size + y]!);
    score += linePenalty(row) + linePenalty(column);
    for (let x = 0; x < size; x++) {
      const i = y * size + x,
        value = cells[i]!;
      dark += value;
      if (
        x + 1 < size &&
        y + 1 < size &&
        value === cells[i + 1] &&
        value === cells[i + size] &&
        value === cells[i + size + 1]
      )
        score += 3;
    }
  }
  return score + Math.floor((Math.abs(2 * dark - size * size) * 10) / (size * size)) * 10;
}
