import { codewords } from "./codewords.js";
import { format, functionGrid, type Grid } from "./functions.js";
import { applyMask, place } from "./mask.js";
import { penalty } from "./penalty.js";
import { type Level, selectVersion } from "./profile.js";

export interface QRMatrix {
  readonly version: number;
  readonly level: Level;
  readonly mask: number;
  readonly size: number;
  readonly cells: readonly number[];
  readonly protectedCells: readonly number[];
}

function candidate(base: Grid, level: Level, mask: number): Grid {
  const grid = { ...base, cells: base.cells.slice() };
  applyMask(grid, mask);
  format(grid, level, mask);
  return grid;
}

function best(base: Grid, level: Level, requested: number) {
  if (requested >= 0) return { grid: candidate(base, level, requested), mask: requested };
  let score = Infinity,
    grid = base,
    mask = 0;
  for (let index = 0; index < 8; index++) {
    const trial = candidate(base, level, index);
    const trialScore = penalty(trial.cells, trial.size);
    if (trialScore < score) {
      score = trialScore;
      grid = trial;
      mask = index;
    }
  }
  return { grid, mask };
}

/** Internal Model 2 byte-mode encoder. ASCII, versions 1..10, M/H, all eight masks; no runtime dependencies. */
export function encodeQR(value: string, level: Level = "M", version = 0, mask = -1): QRMatrix {
  const chosen = selectVersion(value, level, version, mask);
  const base = functionGrid(chosen, level);
  place(base, codewords(value, chosen, level));
  const result = best(base, level, mask);
  return Object.freeze({
    version: chosen,
    level,
    mask: result.mask,
    size: base.size,
    cells: Object.freeze(Array.from(result.grid.cells)),
    protectedCells: Object.freeze(Array.from(base.fixed)),
  });
}
