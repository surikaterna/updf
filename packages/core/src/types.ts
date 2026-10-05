export type TextAlign = "left" | "center" | "right";

/** Top-left coordinates and dimensions in PDF points; bounds are runtime checked. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TextNode extends Box {
  readonly type: "text";
  /** ASCII plus LF by default; named prepared fonts enable the documented Unicode profile. */
  readonly text: string;
  readonly fontSize: number;
  /** Absolute points, at least fontSize. No implicit defaults or shrinking. */
  readonly lineHeight: number;
  readonly align: TextAlign;
  /** Resource id; omission requires the selected text service's explicit defaultFont. */
  readonly font?: string;
}

export interface RichTextNode extends Box {
  readonly type: "richText";
  readonly paragraphs: readonly ParagraphDefinition[];
}

export interface RectangleNode extends Box, Painting {
  readonly type: "rect";
}

export interface LineNode extends Painting {
  readonly type: "line";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
}

export type PaintingGroupNode = PaintGroup<NodeDefinition>;
export type NodeDefinition = TextNode | RichTextNode | RectangleNode | LineNode | PathNode | PaintingGroupNode;

export interface PageDefinition {
  readonly width: number;
  readonly height: number;
  readonly children: readonly NodeDefinition[];
}

export interface DocumentDefinition {
  readonly version: 1;
  readonly pages: readonly PageDefinition[];
}

export type DiagnosticCode =
  | "TYPE"
  | "KEY"
  | "VERSION"
  | "VALUE"
  | "GEOMETRY"
  | "BOUNDS"
  | "CHARACTER"
  | "LIMIT"
  | "TOKEN_OVERFLOW"
  | "VERTICAL_OVERFLOW"
  | "VDOM_HIERARCHY"
  | "VDOM_CYCLE"
  | "VDOM_REGISTRY"
  | "VDOM_COMPONENT"
  | "MEASUREMENT_CONTEXT"
  | "LAYOUT_OVERSIZED"
  | "FONT_DATA"
  | "FONT_RESOURCE"
  | "FONT_PROFILE"
  | "FONT_INK"
  | "GLYPH_MISSING"
  | "FONT_FORMAT"
  | "FONT_RIGHTS"
  | "PAINT"
  | "PATH_SYNTAX"
  | "SVG_XML"
  | "SVG_STYLE"
  | "SVG_UNSUPPORTED"
  | "SVG_GEOMETRY";

export interface SourceSpan {
  readonly start: number;
  readonly end: number;
}

export interface DocumentDiagnostic {
  readonly code: DiagnosticCode;
  /** Escaped JSONPointer; the empty string refers to the document root. */
  readonly path: string;
  readonly message: string;
  /** Optional original source UTF16 offsets for string adapters. */
  readonly span?: SourceSpan;
}

import type { ParagraphDefinition } from "./measurement/types.js";
import type { PaintGroup, Painting, PathNode } from "./painting/types.js";

export type { ParagraphDefinition, TextRun, TextStyle } from "./measurement/types.js";

export type {
  ClipRect,
  CloseCommand,
  CubicCommand,
  LineCommand,
  Matrix,
  MoveCommand,
  Paint,
  Painting,
  PathCommand,
  PathNode,
  RGB,
} from "./painting/types.js";
