import type { DocumentDiagnostic, PaintingGroupNode, SourceSpan } from "@updf/core";

/** Point viewport: finite x/y and strictly positive finite w/h. */
export interface SVGTarget {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
/** Recoverable preparation warning; structured data has paths but no XML source spans. */
export interface SVGPreparationDiagnostic extends DocumentDiagnostic {
  readonly span?: SourceSpan;
  readonly severity: "warning";
}
/** XML warning with original half-open UTF-16 offsets into the source. */
export interface SVGDiagnostic extends SVGPreparationDiagnostic {
  readonly span: SourceSpan;
}
/** Frozen prepared painting and warnings from either XML or structured input. */
export interface PreparedSVGCompilation {
  readonly node: PaintingGroupNode;
  readonly diagnostics: readonly SVGPreparationDiagnostic[];
}
/** compileSVG's XML parser supplies spans throughout CSS provenance, unlike the shared prepared compiler. */
export interface SVGCompilation extends PreparedSVGCompilation {
  readonly diagnostics: readonly SVGDiagnostic[];
}
/** Absolute original UTF16 boundaries for every decoded character plus EOF. */
export interface SourceText {
  readonly value: string;
  readonly offsets?: readonly number[];
  readonly span?: SourceSpan;
}
export type Attribute = SourceText;
export interface XMLText {
  readonly kind: "text";
  readonly text: string;
  readonly offsets?: readonly number[];
  readonly span?: SourceSpan;
  readonly path: string;
}
export interface XMLElement {
  readonly kind: "element";
  readonly name: string;
  readonly attrs: Readonly<Record<string, Attribute>>;
  readonly children: readonly (XMLElement | XMLText)[];
  readonly span?: SourceSpan;
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
  readonly span?: SourceSpan;
  readonly path: string;
}
export interface ClassRule {
  readonly names: readonly string[];
  readonly declarations: readonly Declaration[];
}
