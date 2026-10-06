import { ledger } from "../measurement/ledger.js";
import type { InkBounds } from "../measurement/types.js";
import { ink } from "../nodes/wiring.js";
import { type Bounds, intersection } from "../painting/bounds.js";
import type { Matrix } from "../painting/types.js";
import type { NodeDefinition } from "../types.js";
import { measure } from "./measure.js";
import type { MeasuredNode } from "./plan.js";
import type { Policy } from "./policy.js";
import type { ResolvedTextResources as ResolvedFonts } from "./text-resources.js";

const identity: Matrix = [1, 0, 0, 1, 0, 0];
interface Task {
  readonly node: MeasuredNode;
  readonly transform: Matrix;
  readonly clip?: Bounds;
}
export function nativeInk(nodes: readonly NodeDefinition[], fonts: ResolvedFonts, policy: Policy): InkBounds {
  const pages = measure(
    { version: 1, pages: [{ width: 1, height: 1, children: nodes }] },
    fonts,
    ledger(policy, false),
  );
  const tasks: Task[] = (pages[0]?.children ?? []).map((node) => ({ node, transform: identity }));
  const bounds: InkBounds[] = [];
  while (tasks.length) {
    const task = tasks.pop();
    if (task) scan(task, tasks, bounds);
  }
  return union(bounds);
}
function scan(task: Task, tasks: Task[], output: InkBounds[]): void {
  ink(task.node.type)(task.node, {
    transform: task.transform,
    ...(task.clip ? { clip: task.clip } : {}),
    addBounds: (bounds) => addBounds(bounds, task.clip, output),
    schedule: (nodes, transform, clip) => {
      for (const node of nodes) tasks.push({ node, transform, ...(clip ? { clip } : {}) });
    },
  });
}
function addBounds(bounds: Bounds | undefined, clip: Bounds | undefined, output: InkBounds[]): void {
  const visible = bounds && (clip ? intersection(bounds, clip) : bounds);
  if (visible) output.push({ empty: false, left: visible[0], top: visible[1], right: visible[2], bottom: visible[3] });
}
function union(bounds: readonly InkBounds[]): InkBounds {
  const nonempty = bounds.filter((item) => !item.empty);
  if (!nonempty.length) return Object.freeze({ empty: true });
  return Object.freeze({
    empty: false,
    left: nonempty.reduce((edge, item) => Math.min(edge, item.left), Infinity),
    right: nonempty.reduce((edge, item) => Math.max(edge, item.right), -Infinity),
    top: nonempty.reduce((edge, item) => Math.min(edge, item.top), Infinity),
    bottom: nonempty.reduce((edge, item) => Math.max(edge, item.bottom), -Infinity),
  });
}
