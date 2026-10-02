import type { DocumentDiagnostic, PaintingGroupNode, SourceSpan } from "@updf/core";

export interface SVGTarget {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
export interface SVGDiagnostic extends DocumentDiagnostic {
  readonly span: SourceSpan;
  readonly severity: "warning";
}
export interface SVGCompilation {
  readonly node: PaintingGroupNode;
  readonly diagnostics: readonly SVGDiagnostic[];
}
/** Absolute original UTF16 boundaries for every decoded character plus EOF. */
export interface SourceText {
  readonly value: string;
  readonly offsets: readonly number[];
  readonly span: SourceSpan;
}
export type Attribute = SourceText;
export interface XMLText {
  readonly kind: "text";
  readonly text: string;
  readonly offsets: readonly number[];
  readonly span: SourceSpan;
  readonly path: string;
}
export interface XMLElement {
  readonly kind: "element";
  readonly name: string;
  readonly attrs: Readonly<Record<string, Attribute>>;
  readonly children: readonly (XMLElement | XMLText)[];
  readonly span: SourceSpan;
  readonly path: string;
}
export interface XMLScanner {
  readonly source: string;
  offset: number;
  elements: number;
}
export interface Declaration {
  readonly name: string;
  readonly value: string;
  readonly span: SourceSpan;
  readonly path: string;
}
export interface ClassRule {
  readonly names: readonly string[];
  readonly declarations: readonly Declaration[];
}
