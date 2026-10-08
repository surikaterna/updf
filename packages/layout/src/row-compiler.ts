import { array, fail, type LayoutOperation, validateDataObject as record } from "@updf/core/internal";
import { type BoxLayoutPlan, finishBoxLayout } from "@updf/layout-boxes/boxes";
import { autoMarginInput } from "./auto-margin.js";
import { columnBody } from "./column-content.js";
import { columnInput, columnSizing } from "./column-sizing.js";
import { containerProducer } from "./container-producer.js";
import { stackHeight } from "./stack.js";
import type { PreparedBlock } from "./protocol.js";
import { rowProducer } from "./row-producer.js";
import { rowAllocation, rowKernel } from "./row-boxes.js";
import type { RowAlignment } from "./row-types.js";
import { sizing } from "./sizing.js";

export function compileRow(
  value: Record<string, unknown>,
  width: number,
  path: string,
  operation: LayoutOperation,
  tasks: (() => void)[],
  schedule: (values: readonly unknown[], width: number, path: string, target: PreparedBlock[]) => void,
  finish: (block: PreparedBlock) => void,
  onColumn: (value: object, block: PreparedBlock, width: number) => void,
): void {
  const { box, columns, boxes, plan } = rowSizing(value, width, operation, path);
  const children = columns.map(() => [] as PreparedBlock[]);
  tasks.push(() =>
    finishRow(box, boxes, children, plan, path, (block, prepared) => {
      prepared.forEach((column, i) => {
        const value = columns[i];
        if (value) onColumn(value, column, column.naturalSize.width);
      });
      finish(block);
    }),
  );
  for (let i = columns.length - 1; i >= 0; i--) {
    const column = columns[i],
      request = plan.requests[i],
      target = children[i];
    if (column && request && target)
      schedule(columnBody(column), request.allocation.width, `${path}/children/${i}/children`, target);
  }
}
function rowSizing(value: Record<string, unknown>, width: number, operation: LayoutOperation, path: string) {
  autoMarginInput(value, false, path);
  record(value, ["type", "children", "align", "style"], path);
  for (const key of ["align", "style"])
    if (key in value && value[key] === undefined) fail("TYPE", `${path}/${key}`, "Omit undefined fields");
  const align = value.align ?? "top";
  if (!["top", "middle", "bottom", "stretch"].includes(align as string)) fail("TYPE", path, "Invalid Row alignment");
  const box = sizing(value.style, width, `${path}/style`);
  if (box.style.overflow === "hidden") fail("TYPE", path, "Row overflow must be error");
  array(value.children, operation.policy.nodes, `${path}/children`);
  const columns = value.children.map((child, i) => columnInput(child, `${path}/children/${i}`));
  const boxes = columns.map((column, i) => columnSizing(column, box.contentWidth, `${path}/children/${i}`));
  validateColumns(columns, align, operation, path);
  const plan = rowAllocation(box, columns, boxes, align as RowAlignment, path);
  return { box, columns, boxes, plan };
}
function validateColumns(
  columns: readonly Record<string, unknown>[],
  align: unknown,
  operation: LayoutOperation,
  path: string,
): void {
  columns.forEach((column, i) => {
    array(column.children, operation.policy.nodes, `${path}/children/${i}/children`);
    if (
      align === "stretch" &&
      ["height", "minHeight", "maxHeight"].some((key) => key in ((column.style as object) ?? {}))
    )
      fail("TYPE", `${path}/children/${i}`, "Stretch conflicts with Column height constraints");
  });
}
function finishRow(
  box: ReturnType<typeof sizing>,
  boxes: readonly ReturnType<typeof sizing>[],
  children: readonly PreparedBlock[][],
  plan: BoxLayoutPlan<number>,
  path: string,
  finish: (block: PreparedBlock, columns: readonly PreparedBlock[]) => void,
): void {
  const bodies = boxes.map((sized, i) => {
    const height = stackHeight(children[i] ?? [], sized.gap);
    if (!Number.isFinite(height)) fail("GEOMETRY", `${path}/children/${i}`, "Natural Column height must be finite");
    return height;
  });
  const layout = rowKernel(
    () =>
      finishBoxLayout(
        plan,
        plan.requests.map((request) => ({
          request,
          height: bodies[request.content]!,
        })),
      ),
    path,
    false,
    boxes.flatMap((sized, i) => (sized.style.overflow === "hidden" ? [`${path}/children/${i}`] : [])),
  );
  const root = layout.boxes[0]!;
  const offsets = layout.childIndices.map((index) => layout.boxes[index]!);
  const columns = offsets.map((offset, i) => {
    const sized = { ...boxes[i]!, width: offset.width, contentWidth: offset.allocation.width };
    const bodyHeight = bodies[i]!;
    return containerProducer(
      sized,
      children[i] ?? [],
      true,
      Math.max(1, offset.height, bodyHeight + sized.vertical),
      `${path}/children/${i}`,
      false,
      { bodyHeight, height: offset.height },
    );
  });
  const placement = Object.freeze({
    height: root.height,
    children: Object.freeze(offsets.map(({ left, top, width, height }) => Object.freeze({ left, top, width, height }))),
  });
  finish(rowProducer(box, columns, placement, path), columns);
}
