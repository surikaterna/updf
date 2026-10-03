import { fail } from "@updf/core/internal";

const names = new WeakMap<object, string>();
export function registerAdapter(adapter: object, name: string): void {
  names.set(adapter, name);
}
export function adapterName(adapter: object): string {
  const name = names.get(adapter);
  if (!name) fail("TYPE", "/extensions", "Expected an owned content adapter");
  return name;
}
