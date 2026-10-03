/** Candidate-local continuation data. Only accepted candidates publish a new state. */
export class FragmentState {
  private values: ReadonlyMap<object, ReadonlyMap<number, bigint>> = new Map();
  fork(): FragmentState {
    const copy = new FragmentState();
    copy.values = this.values;
    return copy;
  }
  adopt(candidate: FragmentState): void {
    this.values = candidate.values;
  }
  get(owner: object, offset: number): bigint | undefined {
    return this.values.get(owner)?.get(offset);
  }
  set(owner: object, offset: number, remaining: bigint): void {
    const offsets = new Map(this.values.get(owner));
    offsets.set(offset, remaining);
    const values = new Map(this.values);
    values.set(owner, offsets);
    this.values = values;
  }
}
