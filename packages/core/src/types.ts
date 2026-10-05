/** Horizontal alignment by complete line advance within the text box. */
export type TextAlign = "left" | "center" | "right";

/** Top-left coordinates and dimensions in PDF points; bounds are runtime checked. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Fixed plain-text box; overflow fails rather than clipping, shrinking or creating pages. */
export interface TextNode extends Box {
  readonly type: "text";
  /** ASCII plus LF by default; named prepared fonts enable the documented Unicode profile. */
  readonly text: string;
  readonly fontSize: number;
  /** Absolute points, at least fontSize. No implicit defaults or shrinking. */
  readonly lineHeight: number;
  readonly align: TextAlign;
  /** Omitted or Helvetica uses the built-in font; other ids require host resources. */
  readonly font?: string;
}

/** Fixed rich-text box measured from explicit paragraph/run styles. */
export interface RichTextNode extends Box {
  readonly type: "richText";
  readonly paragraphs: readonly ParagraphDefinition[];
}

/** Painted rectangle in local top-left points; default is a black 0.5-point outline. */
export interface RectangleNode extends Box, Painting {
  readonly type: "rect";
}

/** Local endpoints in points; default is a black 0.5-point stroke. */
export interface LineNode extends Painting {
  readonly type: "line";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
}

/** Recursive native drawing container with local transform/clip, without style inheritance. */
export type PaintingGroupNode = PaintGroup<NodeDefinition>;
/** Supported fixed-page drawing data; arbitrary objects and unknown keys are rejected. */
export type NodeDefinition = TextNode | RichTextNode | RectangleNode | LineNode | PathNode | PaintingGroupNode;

/** Positive page dimensions in points; children paint in array order within page bounds. */
export interface PageDefinition {
  readonly width: number;
  readonly height: number;
  readonly children: readonly NodeDefinition[];
}

/** Readonly version-1 fixed-page input; readonly typing does not require caller-side freezing. */
export interface DocumentDefinition {
  readonly version: 1;
  readonly pages: readonly PageDefinition[];
}

/** Machine-readable failure categories shared by core and optional adapters. */
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

/** Half-open [start, end) UTF-16 offsets into the original adapter/run string. */
export interface SourceSpan {
  readonly start: number;
  readonly end: number;
}

/** Failure location and readable explanation; message wording is not a parsing protocol. */
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
