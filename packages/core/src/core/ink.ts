import type { ResolvedFonts } from "../fonts/resources.js";
import { ledger } from "../measurement/ledger.js";
import { ink, metrics, union } from "../measurement/metrics.js";
import type { InkBounds } from "../measurement/types.js";
import { effectiveStyle } from "../measurement/validate.js";
import { multiply } from "../painting/affine.js";
import { type Bounds, intersection, pathBounds, rectangle } from "../painting/bounds.js";
import { drawing } from "../painting/read.js";
import type { Matrix } from "../painting/types.js";
import type { NodeDefinition } from "../types.js";
import { measure } from "./measure.js";
import type { MeasuredNode } from "./plan.js";
import type { Policy } from "./policy.js";

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
    if (task) scan(task, tasks, bounds, fonts);
  }
  return union(bounds);
}
function scan(task: Task, tasks: Task[], output: InkBounds[], fonts: ResolvedFonts): void {
  const { node, transform, clip } = task;
  if (node.type === "paintGroup") {
    group(node, transform, clip, tasks);
    return;
  }
  if (node.type === "richText") {
    for (const fragment of node.fragments) addInk(fragment.inkBounds, node.x, node.y, transform, clip, output);
    return;
  }
  if (node.type === "text") {
    const style = effectiveStyle({ font: node.font ?? "Helvetica", fontSize: node.fontSize, color: [0, 0, 0] });
    for (const line of node.lines)
      addInk(ink(metrics(line.text, style, fonts, ""), line.x, line.y), 0, 0, transform, clip, output);
    return;
  }
  shape(node, transform, clip, output);
}
function group(
  node: Extract<MeasuredNode, { type: "paintGroup" }>,
  transform: Matrix,
  clip: Bounds | undefined,
  tasks: Task[],
): void {
  const matrix = multiply(transform, node.matrix);
  const localClip = node.clip && rectangle(node.clip.x, node.clip.y, node.clip.width, node.clip.height, matrix);
  const nextClip = clip && localClip ? intersection(clip, localClip) : (clip ?? localClip);
  if (clip && localClip && !nextClip) return;
  for (const child of node.children)
    tasks.push({ node: child, transform: matrix, ...(nextClip ? { clip: nextClip } : {}) });
}
function shape(
  node: Exclude<MeasuredNode, { type: "paintGroup" | "text" | "richText" }>,
  transform: Matrix,
  clip: Bounds | undefined,
  output: InkBounds[],
): void {
  const painting = node.painting ?? drawing({ ...node }, "");
  const paint = {
    ...painting.paint,
    fill: painting.paint.fillOpacity === 0 ? null : painting.paint.fill,
    stroke: painting.paint.strokeOpacity === 0 ? null : painting.paint.stroke,
  };
  addBounds(pathBounds(painting.commands, multiply(transform, painting.matrix), paint), clip, output);
}
function addInk(
  bounds: InkBounds,
  x: number,
  y: number,
  transform: Matrix,
  clip: Bounds | undefined,
  output: InkBounds[],
): void {
  if (bounds.empty) return;
  addBounds(
    rectangle(bounds.left + x, bounds.top + y, bounds.right - bounds.left, bounds.bottom - bounds.top, transform),
    clip,
    output,
  );
}
function addBounds(bounds: Bounds | undefined, clip: Bounds | undefined, output: InkBounds[]): void {
  const visible = bounds && (clip ? intersection(bounds, clip) : bounds);
  if (visible) output.push({ empty: false, left: visible[0], top: visible[1], right: visible[2], bottom: visible[3] });
}
