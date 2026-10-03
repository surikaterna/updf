import { sum } from "@updf/core/internal";
import type { OutputBudget } from "./budget.js";
import { containerTotals } from "./container-budget.js";
import type { FragmentState } from "./fragment-state.js";
import type { AncestorReservation, FragmentRequest } from "./protocol.js";
import type { Sizing } from "./sizing.js";

/** Reserve ancestors when a real positive-height child becomes known, before its data is copied. */
export function containerReservation(
  box: Sizing,
  request: FragmentRequest,
  path: string,
  closed?: { readonly height: number; readonly hidden: boolean },
): AncestorReservation {
  const owner = {};
  return {
    ...(request.reserve ? { parent: request.reserve } : {}),
    apply(budget, state, contentHeight) {
      const height = closed?.height ?? sum([box.vertical, contentHeight]);
      const counts = containerTotals(box, height, closed?.hidden ?? false);
      const nodes = Number(state?.get(owner, 0) ?? 0n),
        commands = Number(state?.get(owner, 1) ?? 0n);
      if (counts.nodes !== nodes || counts.commands !== commands) {
        budget?.generated(counts.nodes - nodes, 0, counts.commands - commands, 0, path);
        state?.set(owner, 0, BigInt(counts.nodes));
        state?.set(owner, 1, BigInt(counts.commands));
      }
      return height;
    },
  };
}
export function reserveAncestors(
  reservation: AncestorReservation | undefined,
  budget: OutputBudget | undefined,
  state: FragmentState | undefined,
  height: number,
): void {
  let current = reservation;
  while (current) {
    height = current.apply(budget, state, height);
    current = current.parent;
  }
}
export function offsetReservation(parent: AncestorReservation, offset: number): AncestorReservation {
  return { parent, apply: (_budget, _state, height) => sum([offset, height]) };
}
