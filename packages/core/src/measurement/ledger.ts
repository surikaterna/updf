import { checkLimit, type Policy, policy } from "../core/policy.js";

export interface WorkLedger {
  readonly policy: Policy;
  readonly texts: WeakMap<object, number>;
  readonly inputs: WeakSet<object>;
  nodes: number;
  readonly logicalText: boolean;
  units: number;
  chars: number;
}
export function work(ledger: WorkLedger, amount: number, path: string): void {
  ledger.units = checkLimit(ledger.units + amount, Number.MAX_SAFE_INTEGER, path, "Internal work counter");
}
export function characters(ledger: WorkLedger, amount: number, path: string): void {
  ledger.chars = checkLimit(ledger.chars + amount, ledger.policy.textCodePoints, path, "Text code points");
}
export function textOnce(ledger: WorkLedger, owner: object, amount: number, path: string): void {
  const previous = ledger.logicalText ? (ledger.texts.get(owner) ?? 0) : 0;
  characters(ledger, Math.max(0, amount - previous), path);
  ledger.texts.set(owner, Math.max(previous, amount));
}
export function inputNode(ledger: WorkLedger, owner: object, path: string): void {
  if (ledger.inputs.has(owner)) return;
  ledger.nodes = checkLimit(ledger.nodes + 1, ledger.policy.nodes, path, "Measurement source nodes");
  ledger.inputs.add(owner);
}
export function ledger(limits: Policy = policy(), logicalText = true): WorkLedger {
  return { units: 0, chars: 0, nodes: 0, policy: limits, texts: new WeakMap(), inputs: new WeakSet(), logicalText };
}
