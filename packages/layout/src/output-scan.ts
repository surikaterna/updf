import { fail, type Policy, validateDataObject as record } from "@updf/core/internal";
import { isEmissionNode } from "./emission-nodes.js";

interface Frame {
  readonly values: readonly unknown[];
  readonly path: string;
  index: number;
}
export interface OutputCharges {
  readonly node: () => void;
  readonly text: (value: string) => void;
  readonly commands: (count: number) => void;
}
function frame(value: unknown, path: string, max: number): Frame {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype)
    fail("TYPE", path, "Expected ordinary output array");
  if (value.length > max) fail("LIMIT", path, "Output array exceeds node policy");
  return { values: value, path, index: 0 };
}
function item(values: readonly unknown[], index: number, path: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
  if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
    fail("TYPE", path, "Expected dense own output data");
  return descriptor.value;
}
function fields(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object") fail("TYPE", path, "Expected output data object");
  record(value, Object.keys(value), path);
  return value;
}
function rich(value: unknown, path: string, charges: OutputCharges, policy: Policy): void {
  const paragraphs = frame(value, path, policy.nodes);
  for (let p = 0; p < paragraphs.values.length; p++) {
    const paragraph = fields(item(paragraphs.values, p, path), path);
    const runs = frame(paragraph.runs, path, policy.nodes);
    for (let r = 0; r < runs.values.length; r++) {
      const run = fields(item(runs.values, r, path), path);
      if (typeof run.text !== "string") fail("TYPE", path, "Expected output text");
      charges.text(run.text);
    }
    dense(runs);
  }
  dense(paragraphs);
}
function dense(frame: Frame): void {
  if (Reflect.ownKeys(frame.values).length !== frame.values.length + 1)
    fail("TYPE", frame.path, "Dense output arrays only");
}
export function scanOutput(value: unknown, path: string, charges: OutputCharges, policy: Policy): void {
  const pending: Frame[] = [frame(value, path, policy.nodes)];
  const active = new Set<object>();
  const owners: (object | undefined)[] = [undefined];
  while (pending.length) {
    const current = pending.at(-1);
    if (!current) break;
    if (current.index === current.values.length) {
      dense(current);
      pending.pop();
      const owner = owners.pop();
      if (owner) active.delete(owner);
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(current.values, String(current.index));
    // Owned immutable placeholders are charged only when their final output exists.
    if (descriptor && "value" in descriptor && isEmissionNode(descriptor.value)) {
      current.index++;
      continue;
    }
    charges.node();
    const node = fields(item(current.values, current.index++, path), path);
    if (active.has(node)) fail("TYPE", path, "Cyclic native output");
    if (node.type === "paintGroup") {
      active.add(node);
      owners.push(node);
      pending.push(frame(node.children, path, policy.nodes));
    }
    if (node.type === "text") {
      if (typeof node.text !== "string") fail("TYPE", path, "Expected output text");
      charges.text(node.text);
    }
    if (node.type === "richText") rich(node.paragraphs, path, charges, policy);
    const count =
      node.type === "path"
        ? frame(node.commands, path, Number.MAX_SAFE_INTEGER).values.length
        : node.type === "rect"
          ? 5
          : node.type === "line"
            ? 2
            : 0;
    charges.commands(count);
  }
}
