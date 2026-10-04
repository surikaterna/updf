import { validateDataObject as record } from "@updf/core/internal";
import { contentSnapshot } from "./content-data.js";
import type { ColumnBlock, ColumnInput, RowBlock, RowInput } from "./row-types.js";

export const rowIdentity = Object.freeze({});
export const columnIdentity = Object.freeze({});

export function row(input: RowInput): RowBlock {
  record(input, ["children", "align", "style"], "/row");
  return contentSnapshot({ ...input, type: "row" as const }, "/row");
}
export function column(input: ColumnInput): ColumnBlock {
  record(input, ["children", "width", "style", "keepTogether"], "/column");
  return contentSnapshot({ ...input, type: "column" as const }, "/column");
}
