import {
  array,
  checkLimit,
  codePoints,
  fail,
  isPreparedFont,
  type LayoutOperation,
  type Policy,
  snapshotData,
  validateDataObject,
} from "@updf/core/internal";

interface Counts {
  objects: number;
  text: number;
  readonly active: Set<object>;
  readonly seen: Set<object>;
  readonly policy: Policy;
}
function scan(value: unknown, path: string, depth: number, counts: Counts, tasks: (() => void)[]): void {
  checkLimit(depth, counts.policy.depth, path, "Source depth");
  if (!value || typeof value !== "object") return;
  if (isPreparedFont(value)) return;
  if (counts.active.has(value)) fail("TYPE", path, "Cyclic flow data");
  if (counts.seen.has(value)) return;
  counts.objects = checkLimit(counts.objects + 1, counts.policy.nodes, path, "Source nodes");
  counts.active.add(value);
  tasks.push(() => {
    counts.active.delete(value);
    counts.seen.add(value);
  });
  container(value, path, depth, counts, tasks);
}
function container(value: object, path: string, depth: number, counts: Counts, tasks: (() => void)[]): void {
  if (Array.isArray(value)) array(value, counts.policy.nodes, path);
  else validateDataObject(value, Object.keys(value), path);
  for (const key of Object.keys(value).reverse()) {
    const item = Reflect.get(value, key);
    const at = `${path}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
    if (key === "text" && typeof item === "string")
      counts.text = checkLimit(
        counts.text + codePoints(item),
        counts.policy.textCodePoints,
        at,
        "Source text code points",
      );
    tasks.push(() => scan(item, at, depth + 1, counts, tasks));
  }
}
export function preflight(input: unknown, policy: Policy): void {
  const counts = { objects: 0, text: 0, active: new Set<object>(), seen: new Set<object>(), policy };
  const tasks: (() => void)[] = [];
  scan(input, "", 0, counts, tasks);
  while (tasks.length) tasks.pop()?.();
}
const sources = new WeakMap<LayoutOperation, Counts>();
export function chargeSourceWork(count: number, operation: LayoutOperation, path: string): void {
  preflightSource(null, operation, path);
  const counts = sources.get(operation);
  if (!counts) fail("TYPE", path, "Missing operation source budget");
  counts.objects = checkLimit(counts.objects + count, operation.policy.nodes, path, "Source work nodes");
}
export function preflightSource(input: unknown, operation: LayoutOperation, path: string): void {
  const counts = sources.get(operation) ?? {
    objects: 0,
    text: 0,
    active: new Set<object>(),
    seen: new Set<object>(),
    policy: operation.policy,
  };
  sources.set(operation, counts);
  const tasks: (() => void)[] = [];
  scan(input, path, 0, counts, tasks);
  while (tasks.length) tasks.pop()?.();
}
export function snapshot<T>(value: T): T {
  return snapshotData(value, "/result");
}
