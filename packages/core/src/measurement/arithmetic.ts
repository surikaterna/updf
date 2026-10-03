/** Compensated positive metric accumulation; nonfinite totals remain failures. */
export class MetricSum {
  private total = 0;
  private correction = 0;

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

  get value(): number {
    return this.total + this.correction;
  }
}

export function sum(values: readonly number[]): number {
  const result = new MetricSum();
  for (const value of values) result.add(value);
  return result.value;
}

export function exceeds(actual: number, bound: number, operationScale = 0): boolean {
  if (!Number.isFinite(actual) || !Number.isFinite(bound) || !Number.isFinite(operationScale)) return true;
  if (actual <= bound) return false;
  // Two relative machine epsilons cover metric scaling and compensated addition,
  // not a point-sized allowance. Zero-edge ink uses its positioning operation's
  // scale, not an unrelated large box width for left-aligned glyphs.
  const scale = Math.max(Math.abs(actual), Math.abs(bound), Math.abs(operationScale));
  return actual - bound > scale * (2 * Number.EPSILON);
}
