import { type BlockContent, type BlockPart, defineBlockPart, type MeasureContext } from "@updf/layout";
import { error, number, record } from "./checks.js";
import type { CellProps, RowProps, SectionProps, TableInput, TableProps, TableRow, TableSection } from "./types.js";
import { cell, row, rowOptions } from "./validate.js";

export const Head = defineBlockPart<SectionProps>("table.head");
export const Body = defineBlockPart<{ readonly children?: BlockContent }>("table.body");
export const Foot = defineBlockPart<SectionProps>("table.foot");
export const Row = defineBlockPart<RowProps>("table.row");
export const Cell = defineBlockPart<CellProps>("table.cell");
export const HeaderCell = defineBlockPart<CellProps>("table.header-cell");
const deferred = new WeakMap<TableSection, BlockContent>();
const cellPaths = new WeakMap<object, string>();
export function cellSourcePath(cell: CellProps, root: string, fallback: string): string {
  const path = cellPaths.get(cell);
  return path?.startsWith(`${root}/`) ? path.slice(root.length) : fallback;
}
export const deferredSection = (section: TableSection): BlockContent | undefined => deferred.get(section);

export function fromParts(input: TableProps, context: MeasureContext): TableInput {
  const parts = context.readParts(input.children ?? [], [Head, Body, Foot]);
  const sections = new Map<object, TableSection>();
  for (const part of parts) {
    if (sections.has(part.part)) error(part.sourcePath, "Duplicate table section", "VDOM_HIERARCHY");
    record(part.props, ["repeat", "height"], part.sourcePath);
    if ("height" in part.props) number(part.props.height, `${part.sourcePath}/height`, true);
    if ("repeat" in part.props && typeof part.props.repeat !== "boolean")
      error(part.sourcePath, "Expected repeat boolean");
    if (part.part === Body && ("repeat" in part.props || "height" in part.props))
      error(part.sourcePath, "Body cannot repeat or reserve decoration height");
    const section = {
      rows: part.props.height === undefined ? rows(part, input.columns.length, context) : [],
      ...(part.props.repeat === undefined ? {} : { repeat: part.props.repeat as boolean }),
      ...(part.props.height === undefined ? {} : { height: part.props.height as number }),
    };
    if (part.props.height !== undefined) deferred.set(section, part.content);
    sections.set(part.part, section);
  }
  const props = { ...input };
  delete props.children;
  const head = sections.get(Head),
    foot = sections.get(Foot);
  return {
    ...props,
    body: sections.get(Body)?.rows ?? [],
    ...(head ? { head } : {}),
    ...(foot ? { foot } : {}),
  };
}
function rows(section: BlockPart, columns: number, context: MeasureContext): readonly TableRow[] {
  return context.readParts(section.content, [Row]).map((part) => {
    record(part.props, ["keepTogether", "minHeight"], part.sourcePath);
    rowOptions(part.props, part.sourcePath);
    const cells = context.readParts(part.content, section.part === Head ? [Cell, HeaderCell] : [Cell]);
    const result = {
      ...part.props,
      ...(part.key === undefined ? {} : { key: part.key }),
      cells: cells.map((part) => {
        cell(part.props, part.sourcePath);
        const value = { ...part.props, children: part.content };
        cellPaths.set(value, part.sourcePath);
        return value;
      }),
    };
    row(result, part.sourcePath, columns);
    return result;
  });
}
