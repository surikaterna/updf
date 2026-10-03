import type { RGB } from "@updf/core";
import type { BlockContent, ImplicitInlineContent, ParagraphProps } from "@updf/layout";

export interface CellStyle extends Omit<ParagraphProps, "children" | "keepTogether"> {
  readonly padding?: number;
  readonly background?: RGB;
  readonly height?: number;
  readonly overflow?: "error" | "hidden";
  readonly gap?: number;
}
export interface TableColumn {
  readonly width: number;
  readonly style?: CellStyle;
}
export interface CellProps {
  readonly children?: BlockContent | ImplicitInlineContent;
  readonly style?: CellStyle;
}
export interface RowProps {
  readonly children?: BlockContent;
  readonly keepTogether?: true;
  readonly minHeight?: number;
}
export interface SectionProps {
  readonly height?: number;
  readonly children?: BlockContent;
  readonly repeat?: boolean;
}
export interface TableRow {
  readonly cells: readonly CellProps[];
  readonly keepTogether?: true;
  readonly minHeight?: number;
  readonly key?: string | number;
}
export interface TableSection {
  readonly height?: number;
  readonly rows: readonly TableRow[];
  readonly repeat?: boolean;
}
export interface TableProps {
  readonly columns: readonly TableColumn[];
  readonly style?: CellStyle;
  readonly grid?: { readonly width: number; readonly color: RGB };
  readonly children?: BlockContent;
}
export interface TableInput extends Omit<TableProps, "children"> {
  readonly body: readonly TableRow[];
  readonly head?: TableSection;
  readonly foot?: TableSection;
}
export type TableDefinition = TableProps | TableInput;
