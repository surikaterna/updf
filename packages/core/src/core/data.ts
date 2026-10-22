import { fail } from "./error.js";
import { isExecutableNode } from "./node-ownership.js";
import { isOwnedResource } from "./owned-resource.js";
import { isNativeLeafPayload } from "./native-leaf-ownership.js";

export const pointer = (key: PropertyKey): string => String(key).replaceAll("~", "~0").replaceAll("/", "~1");

export function ownDataValue<T extends object, K extends keyof T>(value: T, key: K, path: string): T[K] | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) return undefined;
  if (!("value" in descriptor) || !descriptor.enumerable) fail("TYPE", path, "Expected enumerable own data field");
  return descriptor.value;
}

export function dataRecord(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("TYPE", path, "Expected ordinary data props");
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail("TYPE", path, "Class instances are not data props");
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== "string" || !descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      fail("TYPE", `${path}/${pointer(key)}`, "Expected enumerable own data fields");
    }
  }
}

export function dataArray(value: unknown, path: string): asserts value is readonly unknown[] {
  for (const item of dataItems(value, path)) void item;
}

function arrayShape(value: unknown, path: string): asserts value is readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype)
    fail("TYPE", path, "Expected an ordinary array");
}
/** Check descriptors as consumed, without inspecting or scheduling unvisited siblings. */
function* dataItems(value: unknown, path: string): Generator<unknown> {
  arrayShape(value, path);
  const length: unknown = Object.getOwnPropertyDescriptor(value, "length")?.value;
  if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0)
    fail("TYPE", path, "Expected ordinary array length");
  for (let i = 0; i < length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      fail("TYPE", `${path}/${i}`, "Expected enumerable data indices");
    yield descriptor.value;
  }
  if (Reflect.ownKeys(value).length !== length + 1) fail("TYPE", path, "Expected a dense data array");
}
export function scheduleArray(
  value: readonly unknown[],
  path: string,
  tasks: (() => void)[],
  visit: (value: unknown, index: number) => void,
): void {
  const items = dataItems(value, path);
  let index = 0;
  const advance = (): void => {
    const item = items.next();
    if (item.done) return;
    tasks.push(advance);
    visit(item.value, index++);
  };
  tasks.push(advance);
}

interface CopyTask {
  readonly value: unknown;
  readonly path: string;
  readonly assign: (value: unknown) => void;
}
interface SnapshotHooks {
  readonly opaque: (value: unknown, path: string) => boolean;
  readonly visit: (value: unknown, path: string) => void;
}
function container(value: object, path: string): object {
  if (Array.isArray(value)) {
    arrayShape(value, path);
    return [];
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail("TYPE", path, "Class instances are not data props");
  return prototype === null ? Object.create(null) : {};
}
/** Keep only one pending sibling; validate its descriptor when it is consumed. */
function* recordItems(value: object, path: string): Generator<readonly [string, unknown]> {
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== "string" || !descriptor || !("value" in descriptor) || !descriptor.enumerable)
      fail("TYPE", `${path}/${pointer(key)}`, "Expected enumerable own data fields");
    yield [key, descriptor.value];
  }
}
function copyTask(task: CopyTask, tasks: (() => void)[], active: Set<object>, hooks: SnapshotHooks): void {
  const { value, path, assign } = task;
  // Charge every occurrence before any terminal shortcut, assignment or child copy.
  hooks.visit(value, path);
  if (isOwnedResource(value) || isNativeLeafPayload(value) || hooks.opaque(value, path)) {
    assign(value);
    return;
  }
  if (isExecutableNode(value)) fail("TYPE", path, "Executable nodes are not ordinary data props");
  if (value === null || value === undefined || ["string", "boolean", "number"].includes(typeof value)) {
    assign(value);
    return;
  }
  if (typeof value !== "object") fail("TYPE", path, "Executable values are not data");
  if (active.has(value)) fail("VDOM_CYCLE", path, "Cyclic data props");
  const result = container(value, path);
  assign(result);
  active.add(value);
  tasks.push(() => {
    active.delete(value);
    Object.freeze(result);
  });
  copyChildren(value, result, path, tasks, active, hooks);
}
function copyChildren(
  value: object,
  result: object,
  path: string,
  tasks: (() => void)[],
  active: Set<object>,
  hooks: SnapshotHooks,
): void {
  if (Array.isArray(value)) {
    scheduleArray(value, path, tasks, (item, index) => {
      copyTask(
        {
          value: item,
          path: `${path}/${index}`,
          assign: (item) => {
            Object.defineProperty(result, String(index), { value: item, enumerable: true });
          },
        },
        tasks,
        active,
        hooks,
      );
    });
    return;
  }
  copyRecord(value, result, path, tasks, active, hooks);
}
function copyRecord(
  value: object,
  result: object,
  path: string,
  tasks: (() => void)[],
  active: Set<object>,
  hooks: SnapshotHooks,
): void {
  const items = recordItems(value, path);
  const advance = (): void => {
    const item = items.next();
    if (item.done) return;
    const [key, child] = item.value;
    tasks.push(advance);
    copyTask(
      {
        value: child,
        path: `${path}/${pointer(key)}`,
        assign: (item: unknown) => {
          Object.defineProperty(result, key, { value: item, enumerable: true });
        },
      },
      tasks,
      active,
      hooks,
    );
  };
  tasks.push(advance);
}
export function snapshot<T>(
  value: T,
  path: string,
  opaque: (value: unknown, path: string) => boolean = () => false,
  visit: (value: unknown, path: string) => void = () => {},
): T {
  let result: unknown;
  const tasks: (() => void)[] = [];
  const active = new Set<object>();
  const task = {
    value,
    path,
    assign: (item: unknown) => {
      result = item;
    },
  };
  copyTask(task, tasks, active, { opaque, visit });
  while (tasks.length) tasks.pop()?.();
  // Shape is preserved only after descriptor validation and an owned frozen copy.
  return result as T;
}
