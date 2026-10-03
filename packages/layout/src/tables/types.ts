import type { ParagraphDefinition, RGB, TextAlign, TextStyle } from "@updf/core";
import type { FlowBlock, FlowPlacement, FlowResult, PageTemplate } from "../types.js";

export interface TableDefaults {
  readonly defaultStyle: TextStyle;
  readonly lineHeight: number;
  readonly align: TextAlign;
  readonly whiteSpace: ParagraphDefinition["whiteSpace"];
  readonly breakLongWords: ParagraphDefinition["breakLongWords"];
  readonly padding: number;
  readonly background?: RGB;
}
export type TableOverrides = Partial<Omit<TableDefaults, "defaultStyle">> & {
  readonly defaultStyle?: Partial<TextStyle>;
};
export interface TableColumn {
  readonly width: number;
  readonly defaults?: TableOverrides;
}
export interface TableCell {
  readonly paragraph: Omit<
    ParagraphDefinition,
    "defaultStyle" | "lineHeight" | "align" | "whiteSpace" | "breakLongWords"
  > &
    Partial<Omit<ParagraphDefinition, "runs" | "defaultStyle">> & { readonly defaultStyle?: Partial<TextStyle> };
  readonly padding?: number;
  readonly background?: RGB;
}
export interface TableRow {
  readonly cells: readonly TableCell[];
  readonly minRowHeight?: number;
}
export interface TableDefinition {
  readonly type: "table";
  readonly columns: readonly TableColumn[];
  readonly defaults: TableDefaults;
  readonly rows: readonly TableRow[];
  readonly header?: TableRow;
  readonly repeatHeader: boolean;
  readonly align: TextAlign;
  readonly grid?: { readonly width: number; readonly color: RGB };
}
export interface TableDocumentDefinition {
  readonly pageTemplate: PageTemplate;
  readonly table: TableDefinition;
}
export interface TableFlowDefinition {
  readonly pageTemplate: PageTemplate;
  readonly body: readonly (FlowBlock | TableDefinition)[];
}
export interface TablePlacement extends FlowPlacement {
  readonly tableIndex: number;
  /** Header is -1; header copies never count as consumed body rows. */
  readonly rowIndex: number;
  readonly repeatedHeader: boolean;
}
export interface TableResult extends FlowResult {
  readonly tablePlacements: readonly TablePlacement[];
  readonly repeatedHeaderCount: number;
  readonly consumedBodyRowCount: number;
}
