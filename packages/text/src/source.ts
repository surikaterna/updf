import { checkLimit, dataArray, dataRecord, fail, pointer } from "@updf/core/internal";
import { inputNode, type WorkLedger } from "./ledger.js";

/** All source containers are checked before measurement can allocate glyph/line arrays. */
export function preflight(input: unknown, budget: WorkLedger, path: string): void {
  const active = new Set<object>();
  const tasks: (() => void)[] = [];
  const scan = (value: unknown, path: string, depth: number): void => {
    if (!value || typeof value !== "object") return;
    checkLimit(depth, budget.policy.depth, path, "Measurement source depth");
    if (active.has(value)) fail("TYPE", path, "Cyclic measurement data");
    inputNode(budget, value, path);
    if (Array.isArray(value)) {
      checkLimit(value.length, budget.policy.nodes, path, "Measurement source nodes");
      dataArray(value, path);
    } else dataRecord(value, path);
    active.add(value);
    tasks.push(() => {
      active.delete(value);
    });
    for (const key of Object.keys(value).reverse()) {
      const child = Reflect.get(value, key);
      tasks.push(() => scan(child, `${path}/${pointer(key)}`, depth + 1));
    }
  };
  scan(input, path, 0);
  while (tasks.length) tasks.pop()?.();
}
