import { boxStyle } from "./box-style.js";
import type { BoxLimits, BoxStyle, BoxView, LayoutBoxesInput } from "./box-types.js";
import { fail } from "./error.js";
import { number, record } from "./width-validation.js";

export interface BoxNode<C> {
  readonly id: string;
  readonly path: string;
  readonly parentIndex: number | null;
  readonly style: BoxStyle;
  readonly content: C | undefined;
  readonly children: number[];
}
export function boxInput<N, C>(input: LayoutBoxesInput<N, C>) {
  const data = record(input, ["root", "view", "width", "limits", "exactInlineEdges", "measure"], "/boxes");
  for (const key of Object.keys(data))
    if (data[key] === undefined) fail("TYPE", `/boxes/${key}`, "Omit undefined fields");
  if (!("root" in data)) fail("TYPE", "/boxes/root", "Expected root");
  number(data.width, "/boxes/width", true);
  const view = record(data.view, ["id", "path", "style", "childCount", "childAt", "content"], "/boxes/view");
  for (const key of ["id", "path", "style", "childCount", "childAt", "content"])
    if (typeof view[key] !== "function") fail("TYPE", `/boxes/view/${key}`, "Expected callback");
  if ("measure" in data && typeof data.measure !== "function") fail("TYPE", "/boxes/measure", "Expected callback");
  if ("exactInlineEdges" in data && typeof data.exactInlineEdges !== "boolean")
    fail("TYPE", "/boxes/exactInlineEdges", "Expected boolean");
  return Object.assign(Object.create(null), data, {
    view: Object.freeze(view),
    limits: boxLimits(data.limits),
  }) as LayoutBoxesInput<N, C> & { limits: Required<BoxLimits> };
}
function boxLimits(input: unknown): Required<BoxLimits> {
  const data =
    input === undefined
      ? Object.create(null)
      : record(input, ["nodes", "depth", "childCalls", "measurements"], "/boxes/limits");
  const limits = { nodes: 100000, depth: 1024, childCalls: 99999, measurements: 100000 };
  for (const key of Object.keys(limits) as (keyof BoxLimits)[]) {
    if (!(key in data)) continue;
    const value = data[key];
    if (
      typeof value !== "number" ||
      !Number.isSafeInteger(value) ||
      value < (key === "nodes" || key === "depth" ? 1 : 0)
    )
      fail("LIMIT", `/boxes/limits/${key}`, "Expected safe integer budget");
    limits[key] = value;
  }
  return Object.freeze(limits);
}
interface Visit<N> {
  readonly node: N;
  readonly parent: number | null;
  readonly depth: number;
}
interface Children<N> {
  readonly node: N;
  readonly parent: number;
  readonly depth: number;
  readonly count: number;
  readonly next: number;
}
export function collectBoxes<N, C>(root: N, view: BoxView<N, C>, limits: Required<BoxLimits>) {
  const nodes: BoxNode<C>[] = [];
  const ids = new Set<string>(),
    sources = new Map<N, string>();
  const work: (Visit<N> | Children<N>)[] = [{ node: root, parent: null, depth: 1 }];
  let childCalls = 0;
  while (work.length) {
    const task = work.pop();
    if (!task) break;
    if ("next" in task) {
      childCalls = visitChild(task, view, limits, nodes, work, childCalls);
      continue;
    }
    if (nodes.length >= limits.nodes || task.depth > limits.depth)
      fail("LIMIT", "/boxes", "Node or depth budget exceeded");
    const node = readNode(task.node, task.parent, view, ids, sources);
    const index = nodes.length;
    nodes.push(node.data);
    if (task.parent !== null) nodes[task.parent]?.children.push(index);
    if (node.count) work.push({ node: task.node, parent: index, depth: task.depth + 1, count: node.count, next: 0 });
  }
  return { nodes, childCalls };
}
function visitChild<N, C>(
  task: Children<N>,
  view: BoxView<N, C>,
  limits: Required<BoxLimits>,
  nodes: readonly BoxNode<C>[],
  work: (Visit<N> | Children<N>)[],
  childCalls: number,
): number {
  if (task.next === task.count) return childCalls;
  const path = nodes[task.parent]?.path ?? "/boxes";
  if (nodes.length >= limits.nodes || task.depth > limits.depth) fail("LIMIT", path, "Node or depth budget exceeded");
  if (childCalls >= limits.childCalls) fail("LIMIT", path, "Child callback budget exceeded");
  const child = view.childAt(task.node, task.next);
  work.push({ ...task, next: task.next + 1 }, { node: child, parent: task.parent, depth: task.depth });
  return childCalls + 1;
}
function readNode<N, C>(
  source: N,
  parentIndex: number | null,
  view: BoxView<N, C>,
  ids: Set<string>,
  sources: Map<N, string>,
) {
  if (sources.has(source)) fail("VALUE", sources.get(source) as string, "Cycle or repeated source node");
  const path = view.path(source);
  if (typeof path !== "string") fail("TYPE", "/boxes", "Expected source path string");
  sources.set(source, path);
  const id = view.id(source);
  if (typeof id !== "string" || !id.length) fail("TYPE", path, "Expected nonempty source id");
  if (ids.has(id)) fail("VALUE", path, "Repeated source id");
  ids.add(id);
  const style = boxStyle(view.style(source), `${path}/style`);
  const count = view.childCount(source);
  if (!Number.isSafeInteger(count) || count < 0) fail("TYPE", path, "Expected nonnegative safe child count");
  const content = view.content(source);
  if (count && content !== undefined) fail("VALUE", path, "Content is only allowed on leaves");
  return { count, data: { id, path, parentIndex, style, content, children: [] } as BoxNode<C> };
}
