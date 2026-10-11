/** Mutable compensated metric accumulator from `@updf/layout-boxes/arithmetic`; no input validation or implicit units. */
export class MetricSum {
  private total = 0;
  private correction = 0;

  /** Accumulate one metric and return corrected total; nonfinite sums propagate, never clamp or throw here. */
  add(value: number): number {
    const next = this.total + value;
    if (!Number.isFinite(next)) {
      this.total = next;
      this.correction = 0;
      return next;
    }
    this.correction += Math.abs(this.total) >= Math.abs(value) ? this.total - next + value : value - next + this.total;
    this.total = next;
    return this.value;
  }

  /** Corrected current total, initially zero; reading does not reset the accumulator. */
  get value(): number {
    return this.total + this.correction;
  }
}

/** Compensated sum in input order; empty input returns zero, nonfinite values propagate without validation. */
export function sum(values: readonly number[]): number {
  const result = new MetricSum();
  for (const value of values) result.add(value);
  return result.value;
}

/**
 * Compare using two relative machine epsilons at max operand/operation scale
 * (default operationScale 0). Any nonfinite argument returns true. Not a point-sized
 * allowance and not a replacement for native coordinate/bounds certification.
 */
export function exceeds(actual: number, bound: number, operationScale = 0): boolean {
  if (!Number.isFinite(actual) || !Number.isFinite(bound) || !Number.isFinite(operationScale)) return true;
  if (actual <= bound) return false;
  // Two relative machine epsilons cover metric scaling and compensated addition,
  // not a point-sized allowance. Zero-edge ink uses its positioning operation's
  // scale, not an unrelated large box width for left-aligned glyphs.
  const scale = Math.max(Math.abs(actual), Math.abs(bound), Math.abs(operationScale));
  return actual - bound > scale * (2 * Number.EPSILON);
}
