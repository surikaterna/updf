// Static visual authority only; no loader configuration, operation state or resource metadata.
const owners = new WeakSet<object>();
export function ownImagePreparation(owner: object): void {
  owners.add(owner);
}
export function isImagePreparation(owner: object | undefined): boolean {
  return !!owner && owners.has(owner);
}
