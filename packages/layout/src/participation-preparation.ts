import type { VisualSource } from "./visual-owner.js";

export interface ParticipationPreparationOwner {
  readonly identity: object;
  readonly capture: (props: Readonly<Record<string, unknown>>, path: string) => VisualSource;
}
const owners = new WeakMap<object, ParticipationPreparationOwner>();
const definitions = new WeakSet<object>();
export function ownParticipationPreparation(owner: object): void {
  definitions.add(owner);
}
export function isParticipationPreparationOwner(owner: object): boolean {
  return definitions.has(owner);
}
export function associateParticipationPreparation(identity: object, owner: ParticipationPreparationOwner): void {
  owners.set(identity, owner);
}
export function participationPreparationOwner(identity: object): ParticipationPreparationOwner | undefined {
  return owners.get(identity);
}
