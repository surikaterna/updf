import { fail } from "@updf/core/internal";
import { checkFragmentCheckpoint, checkFragmentSlot, type FragmentSlot } from "./fragment-slot.js";

/** Candidate-local continuation data. Only accepted candidates publish a new state. */
export class FragmentState {
  #values: ReadonlyMap<object, ReadonlyMap<number, bigint>> = new Map();
  #slots: ReadonlyMap<object, object> | undefined;
  #family: FragmentState = this;
  fork(): FragmentState {
    const copy = new FragmentState();
    copy.#values = this.#values;
    copy.#slots = this.#slots;
    copy.#family = this.#family;
    return copy;
  }
  adopt(candidate: FragmentState): void {
    // Nested stack/Row selections may publish any fork in the same transaction family.
    if (!candidate || typeof candidate !== "object" || !(#family in candidate) || candidate.#family !== this.#family)
      fail("MEASUREMENT_CONTEXT", "", "Expected a fragment state from this fork family");
    this.#values = candidate.#values;
    this.#slots = candidate.#slots;
  }
  read<T extends object>(slot: FragmentSlot<T>): Readonly<T> | undefined {
    checkFragmentSlot(slot);
    return this.#slots?.get(slot) as Readonly<T> | undefined;
  }
  write<T extends object>(slot: FragmentSlot<T>, checkpoint: Readonly<T>): void {
    checkFragmentSlot(slot);
    checkFragmentCheckpoint(checkpoint);
    const slots = new Map(this.#slots);
    slots.set(slot, checkpoint);
    this.#slots = slots;
  }
  get(owner: object, offset: number): bigint | undefined {
    return this.#values.get(owner)?.get(offset);
  }
  set(owner: object, offset: number, remaining: bigint): void {
    const offsets = new Map(this.#values.get(owner));
    offsets.set(offset, remaining);
    const values = new Map(this.#values);
    values.set(owner, offsets);
    this.#values = values;
  }
}
