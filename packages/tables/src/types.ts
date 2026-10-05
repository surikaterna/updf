import type { RGB } from "@updf/core";
import type {
  BlockContent,
  BorderPolicy,
  BoxStyle,
  ImplicitInlineContent,
  ParagraphStyle,
  WidthTrack,
} from "@updf/layout";

/** Cell defaults merged library → table → column → row → cell → Paragraph → Span; not a table layout box. */
export interface TableStyle extends ParagraphStyle, BoxStyle, BorderPolicy {
  /** Default collapse, inherited through implicit paragraph defaults. */
  readonly whiteSpace?: "preserve" | "collapse";
  /** Default error; codePoint allows otherwise unfit words to split at code points. */
  readonly breakLongWords?: "error" | "codePoint";
  /** Positive finite closed cell border-box height in points. */
  readonly height?: number;
  /** Default error; hidden clips constrained cells, not rows, and is not redaction. */
  readonly overflow?: "error" | "hidden";
  /** Nonnegative point gap between cell blocks; default zero. */
  readonly gap?: number;
}
/** Alias for cell defaults applied at row priority; not a separate row layout box. */
export type RowStyle = TableStyle;
/** Alias for cell style; effective scalar padding defaults to 4pt, with per-edge overrides. */
export type CellStyle = TableStyle;
/** Fixed positive point width or bounded weighted track; no percentages, auto sizing or spans. */
export interface TableColumn {
  readonly width: WidthTrack;
  readonly style?: CellStyle;
}
/** Stacked blocks or all-inline content as one implicit Paragraph; finite numbers are allowed only in the latter. */
export interface CellProps {
  readonly children?: BlockContent | ImplicitInlineContent;
  readonly style?: CellStyle;
}
/** JSX atomic row; omission of keepTogether also means true, false/splitting is unsupported. */
export interface RowProps {
  readonly style?: RowStyle;
  readonly children?: BlockContent;
  readonly keepTogether?: true;
  /** Nonnegative finite minimum row height in points. */
  readonly minHeight?: number;
}
/** Head/Foot reservation; default head first, foot last, repeat true selects every table fragment. */
export interface SectionProps {
  /** Positive finite points; explicit JSX height defers children to sealed final page/fragment context. */
  readonly height?: number;
  readonly children?: BlockContent;
  readonly repeat?: boolean;
}
/** Data atomic row with exactly one cell per column; key is reported for body progress, not head/foot. */
export interface TableRow {
  readonly style?: RowStyle;
  readonly cells: readonly CellProps[];
  readonly keepTogether?: true;
  readonly minHeight?: number;
  readonly key?: string | number;
}
/** Data head/foot rows reserved together; repeat means every fragment, explicit height is positive points. */
export interface TableSection {
  readonly height?: number;
  readonly rows: readonly TableRow[];
  readonly repeat?: boolean;
}
/** JSX table props; nested tables reject and columns are resolved once per occurrence before cells. */
export interface TableProps {
  readonly columns: readonly TableColumn[];
  readonly style?: TableStyle;
  /** Uniform fallback cell edges: nonnegative point width, RGB in [0,1]; explicit borders override it. */
  readonly grid?: { readonly width: number; readonly color: RGB };
  readonly children?: BlockContent;
}
/** Data factory input; empty body emits meaningful head/foot once, or no table geometry when absent. */
export interface TableInput extends Omit<TableProps, "children"> {
  readonly body: readonly TableRow[];
  readonly head?: TableSection;
  readonly foot?: TableSection;
}
/** Adapter input union: JSX author slots or data body rows, not premeasured table output. */
export type TableDefinition = TableProps | TableInput;

export interface ResolvedTableInput extends Omit<TableInput, "columns"> {
  readonly columns: readonly (Omit<TableColumn, "width"> & { readonly width: number })[];
}
