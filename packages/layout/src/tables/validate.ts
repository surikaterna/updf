import type { ParagraphDefinition, RGB } from "@updf/core";
import { array, fail, number, validateDataObject as record } from "@updf/core/internal";
import { snapshot } from "../data.js";
import type { TableCell, TableDefaults, TableDefinition, TableOverrides } from "./types.js";

const defaultKeys = ["defaultStyle", "lineHeight", "align", "whiteSpace", "breakLongWords", "padding", "background"];
function choice(value: unknown, choices: readonly string[], path: string): void {
  if (typeof value !== "string" || !choices.includes(value)) fail("VALUE", path, "Unsupported value");
}
function style(value: unknown, path: string, required = false): void {
  record(value, ["font", "fontSize", "color"], path);
  if (required || "font" in value) {
    if (typeof value.font !== "string" || !value.font.length) fail("TYPE", `${path}/font`, "Expected font id");
  }
  if (required || "fontSize" in value) number(value.fontSize, `${path}/fontSize`, true);
  if (required || "color" in value) color(value.color, `${path}/color`);
}
export function color(value: unknown, path: string): RGB {
  array(value, 3, path);
  if (value.length !== 3) fail("VALUE", path, "Expected RGB triple");
  value.forEach((v, i) => {
    if (number(v, `${path}/${i}`) > 1) fail("VALUE", `${path}/${i}`, "RGB must be at most one");
  });
  return value as unknown as RGB;
}
function overrides(value: unknown, path: string, required = false): void {
  record(value, defaultKeys, path);
  if (required || "padding" in value) number(value.padding, `${path}/padding`);
  if (required || "lineHeight" in value) number(value.lineHeight, `${path}/lineHeight`, true);
  if (required || "align" in value) choice(value.align, ["left", "center", "right"], `${path}/align`);
  if (required || "whiteSpace" in value) choice(value.whiteSpace, ["preserve", "collapse"], `${path}/whiteSpace`);
  if (required || "breakLongWords" in value)
    choice(value.breakLongWords, ["error", "codePoint"], `${path}/breakLongWords`);
  if ("background" in value) color(value.background, `${path}/background`);
  if (required || "defaultStyle" in value) style(value.defaultStyle, `${path}/defaultStyle`, required);
}
function row(value: unknown, count: number, path: string): void {
  record(value, ["cells", "minRowHeight"], path);
  array(value.cells, Number.MAX_SAFE_INTEGER, `${path}/cells`);
  if (value.cells.length !== count) fail("VALUE", `${path}/cells`, "Cell count must equal column count");
  if ("minRowHeight" in value) number(value.minRowHeight, `${path}/minRowHeight`, true);
  value.cells.forEach((cell, i) => {
    const at = `${path}/cells/${i}`;
    record(cell, ["paragraph", "padding", "background"], at);
    if ("padding" in cell) number(cell.padding, `${at}/padding`);
    if ("background" in cell) color(cell.background, `${at}/background`);
    record(
      cell.paragraph,
      ["runs", "defaultStyle", "lineHeight", "align", "whiteSpace", "breakLongWords"],
      `${at}/paragraph`,
    );
    if ("defaultStyle" in cell.paragraph)
      record(cell.paragraph.defaultStyle, ["font", "fontSize", "color"], `${at}/paragraph/defaultStyle`);
  });
}
export function validateTable(value: unknown, path: string): TableDefinition {
  record(value, ["type", "columns", "defaults", "rows", "header", "repeatHeader", "align", "grid"], path);
  if (value.type !== "table") fail("TYPE", `${path}/type`, "Expected table");
  array(value.columns, Number.MAX_SAFE_INTEGER, `${path}/columns`);
  if (!value.columns.length) fail("VALUE", `${path}/columns`, "At least one column is required");
  overrides(value.defaults, `${path}/defaults`, true);
  value.columns.forEach((column, i) => {
    const at = `${path}/columns/${i}`;
    record(column, ["width", "defaults"], at);
    number(column.width, `${at}/width`, true);
    if ("defaults" in column) overrides(column.defaults, `${at}/defaults`);
  });
  choice(value.align, ["left", "center", "right"], `${path}/align`);
  if (typeof value.repeatHeader !== "boolean") fail("TYPE", `${path}/repeatHeader`, "Expected boolean");
  if ("grid" in value) {
    record(value.grid, ["width", "color"], `${path}/grid`);
    number(value.grid.width, `${path}/grid/width`, true);
    color(value.grid.color, `${path}/grid/color`);
  }
  array(value.rows, Number.MAX_SAFE_INTEGER, `${path}/rows`);
  const count = value.columns.length;
  value.rows.forEach((item, i) => {
    row(item, count, `${path}/rows/${i}`);
  });
  if ("header" in value) row(value.header, count, `${path}/header`);
  return snapshot(value) as unknown as TableDefinition;
}
export function effective(
  defaults: TableDefaults,
  column: TableOverrides | undefined,
  cell: TableCell,
): {
  paragraph: ParagraphDefinition;
  padding: number;
  background?: RGB;
} {
  const merged = { ...defaults, ...column, ...cell.paragraph };
  return {
    paragraph: {
      runs: cell.paragraph.runs,
      defaultStyle: {
        ...defaults.defaultStyle,
        ...column?.defaultStyle,
        ...cell.paragraph.defaultStyle,
      },
      lineHeight: merged.lineHeight,
      align: merged.align,
      whiteSpace: merged.whiteSpace,
      breakLongWords: merged.breakLongWords,
    },
    padding: cell.padding ?? column?.padding ?? defaults.padding,
    ...((cell.background ?? column?.background ?? defaults.background)
      ? {
          background: cell.background ?? column?.background ?? defaults.background,
        }
      : {}),
  };
}
