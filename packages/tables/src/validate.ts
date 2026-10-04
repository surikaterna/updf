import { array, error, number, record, rgb } from "./checks.js";
import type { CellProps, CellStyle, TableDefinition, TableInput, TableRow, TableSection } from "./types.js";

export function style(value: unknown, path: string): asserts value is CellStyle {
  record(
    value,
    [
      "font",
      "fontSize",
      "color",
      "lineHeight",
      "textAlign",
      "whiteSpace",
      "breakLongWords",
      "padding",
      "background",
      "height",
      "overflow",
      "gap",
    ],
    path,
  );
  for (const key of ["padding", "height", "gap"] as const) if (key in value) number(value[key], `${path}/${key}`);
  if ("lineHeight" in value) lineHeight(value.lineHeight, `${path}/lineHeight`);
  if ("background" in value) rgb(value.background, `${path}/background`);
  if ("font" in value && typeof value.font !== "string") error(`${path}/font`, "Expected font id");
  if ("fontSize" in value) number(value.fontSize, `${path}/fontSize`, true);
  if ("color" in value) rgb(value.color, `${path}/color`);
  for (const [key, allowed] of [
    ["textAlign", ["left", "center", "right"]],
    ["whiteSpace", ["preserve", "collapse"]],
    ["breakLongWords", ["error", "codePoint"]],
    ["overflow", ["error", "hidden"]],
  ] as const)
    if (key in value && !allowed.some((item) => item === value[key]))
      error(`${path}/${key}`, "Unsupported style value");
}
function lineHeight(value: unknown, path: string): void {
  if (value === "normal") return;
  if (typeof value === "number") {
    number(value, path, true);
    return;
  }
  record(value, ["unit", "value"], path);
  if (value.unit !== "pt") error(`${path}/unit`, "Expected pt line height");
  number(value.value, `${path}/value`, true);
}
export function cell(value: unknown, path: string): asserts value is CellProps {
  record(value, ["children", "style"], path);
  if ("style" in value) style(value.style, `${path}/style`);
  if (typeof value.children === "number" && !Number.isFinite(value.children))
    error(`${path}/children`, "Numeric cell text must be finite");
}
export function row(value: unknown, path: string, columns: number): asserts value is TableRow {
  record(value, ["cells", "keepTogether", "minHeight", "key"], path);
  rowOptions(value, path);
  array(value.cells, `${path}/cells`);
  if (value.cells.length !== columns) error(`${path}/cells`, "Cell count must match column count");
  for (let i = 0; i < value.cells.length; i++) cell(value.cells[i], `${path}/cells/${i}`);
}
export function rowOptions(value: Record<string, unknown>, path: string): void {
  if ("keepTogether" in value && value.keepTogether !== true)
    error(`${path}/keepTogether`, "Rows stay together; splitting is unsupported");
  if ("minHeight" in value) number(value.minHeight, `${path}/minHeight`);
  if ("key" in value && typeof value.key !== "string" && typeof value.key !== "number")
    error(`${path}/key`, "Expected source key");
  if (typeof value.key === "number" && !Number.isFinite(value.key)) error(`${path}/key`, "Expected finite source key");
}
export function section(value: unknown, path: string, columns: number): asserts value is TableSection {
  record(value, ["rows", "repeat", "height"], path);
  if ("height" in value) number(value.height, `${path}/height`, true);
  if ("repeat" in value && typeof value.repeat !== "boolean") error(`${path}/repeat`, "Expected repeat boolean");
  array(value.rows, `${path}/rows`);
  for (let i = 0; i < value.rows.length; i++) row(value.rows[i], `${path}/rows/${i}`, columns);
}
export function validate(input: unknown): TableDefinition {
  record(input, ["columns", "style", "grid", "children", "body", "head", "foot"], "/table");
  array(input.columns, "/table/columns");
  if (!input.columns.length) error("/table/columns", "At least one explicit column is required");
  for (let i = 0; i < input.columns.length; i++) {
    const column = input.columns[i];
    record(column, ["width", "style"], `/table/columns/${i}`);
    number(column.width, `/table/columns/${i}/width`, true);
    if ("style" in column) style(column.style, `/table/columns/${i}/style`);
  }
  if ("style" in input) style(input.style, "/table/style");
  if ("grid" in input) {
    record(input.grid, ["width", "color"], "/table/grid");
    number(input.grid.width, "/table/grid/width");
    rgb(input.grid.color, "/table/grid/color");
  }
  if ("children" in input && ["body", "head", "foot"].some((key) => key in input))
    error("/table", "Use JSX children or data sections, not both");
  if ("body" in input) {
    array(input.body, "/table/body");
    for (let i = 0; i < input.body.length; i++) row(input.body[i], `/table/body/${i}`, input.columns.length);
  }
  for (const name of ["head", "foot"] as const)
    if (name in input) section(input[name], `/table/${name}`, input.columns.length);
  return input as unknown as TableDefinition;
}
export function data(input: TableDefinition): input is TableInput {
  return "body" in input;
}
