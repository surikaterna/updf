import type {
  CollectionHandler,
  CollectionPhase,
  InkHandler,
  InkPhase,
  LoweringHandler,
  MeasurementHandler,
  MeasurementPhase,
  MeasurementProofHandler,
  MeasurementProofPhase,
  NativeWorkHandler,
  NodeKind,
  PaintHandler,
  PaintPhase,
  ValidationHandler,
} from "./context.js";
import { collectLine, lineInk, lineKeys, lineWork, lowerLine, measureLine, paintLine, validateLine } from "./line.js";
import {
  lowerPaintGroup,
  measurePaintGroup,
  paintGroupInk,
  paintGroupKeys,
  paintPaintGroup,
  validatePaintGroup,
} from "./paint-group.js";
import { collectPath, lowerPath, measurePath, paintPath, pathInk, pathKeys, pathWork, validatePath } from "./path.js";
import {
  collectRectangle,
  lowerRectangle,
  measureRectangle,
  paintRectangle,
  rectangleInk,
  rectangleKeys,
  rectangleWork,
  validateRectangle,
} from "./rectangle.js";
import {
  collectRichText,
  lowerRichText,
  measureRichText,
  paintRichText,
  richTextInk,
  richTextKeys,
  richTextWork,
  validateRichText,
} from "./rich-text.js";
import {
  collectXObject,
  lowerXObject,
  measureXObject,
  paintXObject,
  validateXObject,
  xObjectInk,
  xObjectKeys,
} from "./xobject.js";

export function measurement<K extends NodeKind>(kind: K): MeasurementHandler<K> {
  const handlers: MeasurementPhase = {
    rect: (node, context) => measureRectangle(node, context.path),
    line: (node, context) => measureLine(node, context.path),
    path: (node, context) => measurePath(node, context.path),
    richText: (node, context) => measureRichText(node, context.path, context.fonts, context.budget),
    paintGroup: measurePaintGroup,
    xObject: (node, context) => measureXObject(node, context.path, context.fonts.bindings),
  };
  // The exhaustive map preserves the discriminator/function relation that TS loses for a union key.
  return handlers[kind] as MeasurementHandler<K>;
}

export function acceptedKeys(kind: NodeKind): readonly string[] {
  const keys = {
    rect: rectangleKeys,
    line: lineKeys,
    path: pathKeys,
    richText: richTextKeys,
    paintGroup: paintGroupKeys,
    xObject: xObjectKeys,
  } satisfies Record<NodeKind, readonly string[]>;
  return keys[kind];
}

export function validation(kind: NodeKind): ValidationHandler {
  const handlers = {
    rect: validateRectangle,
    line: validateLine,
    path: validatePath,
    richText: validateRichText,
    paintGroup: validatePaintGroup,
    xObject: validateXObject,
  } satisfies Record<NodeKind, ValidationHandler>;
  return handlers[kind];
}

export function painting<K extends NodeKind>(kind: K): PaintHandler<K> {
  const handlers: PaintPhase = {
    rect: paintRectangle,
    line: paintLine,
    path: paintPath,
    richText: paintRichText,
    paintGroup: paintPaintGroup,
    xObject: paintXObject,
  };
  return handlers[kind] as PaintHandler<K>;
}

export function ink<K extends NodeKind>(kind: K): InkHandler<K> {
  const handlers: InkPhase = {
    rect: rectangleInk,
    line: lineInk,
    path: pathInk,
    richText: richTextInk,
    paintGroup: paintGroupInk,
    xObject: xObjectInk,
  };
  return handlers[kind] as InkHandler<K>;
}

export function collection<K extends NodeKind>(kind: K): CollectionHandler<K> | null {
  const handlers: CollectionPhase = {
    rect: collectRectangle,
    line: collectLine,
    path: collectPath,
    richText: collectRichText,
    paintGroup: null,
    xObject: collectXObject,
  };
  return handlers[kind] as CollectionHandler<K> | null;
}

export function lowering(kind: NodeKind): LoweringHandler {
  const handlers = {
    rect: lowerRectangle,
    line: lowerLine,
    path: lowerPath,
    richText: lowerRichText,
    paintGroup: lowerPaintGroup,
    xObject: lowerXObject,
  } satisfies Record<NodeKind, LoweringHandler>;
  return handlers[kind];
}

export function nativeWork(kind: NodeKind): NativeWorkHandler | null {
  const handlers = {
    rect: rectangleWork,
    line: lineWork,
    path: pathWork,
    richText: richTextWork,
    paintGroup: null,
    xObject: null,
  } satisfies Record<NodeKind, NativeWorkHandler | null>;
  return handlers[kind];
}

export function measurementProof<K extends NodeKind>(kind: K): MeasurementProofHandler<K> | null {
  const handlers: MeasurementProofPhase = {
    rect: null,
    line: null,
    path: null,
    richText: measureRichText,
    paintGroup: null,
    xObject: (node, path, fonts) => measureXObject(node, path, fonts.bindings),
  };
  return handlers[kind] as MeasurementProofHandler<K> | null;
}
