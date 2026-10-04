import type { RGB } from "@updf/core";
import type {
  BlockContent,
  BorderPolicy,
  BoxStyle,
  ImplicitInlineContent,
  ParagraphStyle,
  WidthTrack,
} from "@updf/layout";

export interface TableStyle extends ParagraphStyle, BoxStyle, BorderPolicy {
  readonly whiteSpace?: "preserve" | "collapse";
  readonly breakLongWords?: "error" | "codePoint";
  readonly height?: number;
  readonly overflow?: "error" | "hidden";
  readonly gap?: number;
}
export type RowStyle = TableStyle;
export type CellStyle = TableStyle;
export interface TableColumn {
  readonly width: WidthTrack;
  readonly style?: CellStyle;
}
export interface CellProps {
  readonly children?: BlockContent | ImplicitInlineContent;
  readonly style?: CellStyle;
}
export interface RowProps {
  readonly style?: RowStyle;
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
  readonly style?: RowStyle;
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
  readonly style?: TableStyle;
  readonly grid?: { readonly width: number; readonly color: RGB };
  readonly children?: BlockContent;
}
export interface TableInput extends Omit<TableProps, "children"> {
  readonly body: readonly TableRow[];
  readonly head?: TableSection;
  readonly foot?: TableSection;
}
export type TableDefinition = TableProps | TableInput;

export interface ResolvedTableInput extends Omit<TableInput, "columns"> {
  readonly columns: readonly (Omit<TableColumn, "width"> & { readonly width: number })[];
}
