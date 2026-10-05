import { validateDataObject as record } from "@updf/core/internal";
import { contentSnapshot } from "./content-data.js";
import type { ColumnBlock, ColumnInput, RowBlock, RowInput } from "./row-types.js";

export const rowIdentity = Object.freeze({});
export const columnIdentity = Object.freeze({});

/** Frozen row snapshot; rows never split across pages and fail LAYOUT_OVERSIZED when unfit on a fresh body. */
export function row(input: RowInput): RowBlock {
  record(input, ["children", "align", "style"], "/row");
  return contentSnapshot({ ...input, type: "row" as const }, "/row");
}
/** Frozen column snapshot; point/weighted width tracks resolve before content measurement. */
export function column(input: ColumnInput): ColumnBlock {
  record(input, ["children", "width", "style", "keepTogether"], "/column");
  return contentSnapshot({ ...input, type: "column" as const }, "/column");
}
