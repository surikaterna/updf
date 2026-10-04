import { array, fail, type LayoutOperation, validateDataObject as record, sum } from "@updf/core/internal";
import { autoMarginInput } from "./auto-margin.js";
import { columnBody } from "./column-content.js";
import { columnInput, columnSizing } from "./column-sizing.js";
import { containerProducer } from "./container-producer.js";
import type { PreparedBlock } from "./protocol.js";
import { rowHeight, rowProducer } from "./row-producer.js";
import type { RowAlignment } from "./row-types.js";
import { sizing } from "./sizing.js";
import { resolveWidths } from "./width-resolver.js";

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
  const { box, columns, boxes, align } = rowSizing(value, width, operation, path);
  const children = columns.map(() => [] as PreparedBlock[]);
  tasks.push(() =>
    finishRow(box, boxes, children, align, path, (block, prepared) => {
      prepared.forEach((column, i) => {
        const value = columns[i];
        if (value) onColumn(value, column, column.naturalSize.width);
      });
      finish(block);
    }),
  );
  for (let i = columns.length - 1; i >= 0; i--) {
    const column = columns[i],
      sized = boxes[i],
      target = children[i];
    if (column && sized && target)
      schedule(columnBody(column), sized.contentWidth, `${path}/children/${i}/children`, target);
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
  const tracks = columns.length
    ? resolveWidths(
        {
          availableWidth: box.contentWidth,
          gap: box.gap,
          tracks: columns.map((column) => column.width ?? { weight: 1 }),
          maxTracks: operation.policy.nodes,
        },
        path,
      )
    : { widths: [] };
  const boxes = columns.map((column, i) => columnSizing(column, tracks.widths[i] ?? 0, `${path}/children/${i}`));
  validateColumns(columns, align, operation, path);
  return { box, columns, boxes, align: align as RowAlignment };
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
  align: RowAlignment,
  path: string,
  finish: (block: PreparedBlock, columns: readonly PreparedBlock[]) => void,
): void {
  const columns = boxes.map((sized, i) =>
    containerProducer(sized, children[i] ?? [], true, capacity(sized, children[i] ?? []), `${path}/children/${i}`),
  );
  const tallest = columns.reduce((height, column) => Math.max(height, column.naturalSize.height), 0);
  const height = rowHeight(box, columns, path);
  const contentHeight = Math.max(tallest, height - box.vertical);
  const stretched =
    align === "stretch"
      ? boxes.map((sized, i) =>
          containerProducer(
            { ...sized, style: { ...sized.style, height: contentHeight } },
            children[i] ?? [],
            true,
            capacity(sized, children[i] ?? []),
            `${path}/children/${i}`,
          ),
        )
      : columns;
  finish(rowProducer(box, stretched, align, height, path), stretched);
}
function capacity(box: ReturnType<typeof sizing>, children: readonly PreparedBlock[]): number {
  return Math.max(
    1,
    sum([
      box.vertical,
      ...children.map((child) => child.naturalSize.height),
      Math.max(0, children.length - 1) * box.gap,
    ]),
  );
}
