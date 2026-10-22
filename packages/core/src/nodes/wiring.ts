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
import { lowerNativeLeaf, measureNativeLeaf, nativeLeafKeys, validateNativeLeaf } from "./native-leaf.js";

export function measurement<K extends NodeKind>(kind: K): MeasurementHandler<K> {
  const handlers: MeasurementPhase = {
    rect: (node, context) => measureRectangle(node, context.path),
    line: (node, context) => measureLine(node, context.path),
    path: (node, context) => measurePath(node, context.path),
    richText: (node, context) => measureRichText(node, context.path, context.fonts, context.budget),
    nativeLeaf: (node, context) => measureNativeLeaf(node, context.path, context.fonts),
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
    nativeLeaf: nativeLeafKeys,
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
    nativeLeaf: validateNativeLeaf,
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
    nativeLeaf: (node, context) => painting(node.selected.type)({ ...node.selected, x: node.x, y: node.y }, context),
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
    nativeLeaf: (node, context) => ink(node.selected.type)({ ...node.selected, x: node.x, y: node.y }, context),
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
    nativeLeaf: (node, context) =>
      collection(node.selected.type)?.({ ...node.selected, x: node.x, y: node.y }, context),
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
    nativeLeaf: lowerNativeLeaf,
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
    nativeLeaf: null,
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
    nativeLeaf: measureNativeLeaf,
    paintGroup: null,
    xObject: (node, path, fonts) => measureXObject(node, path, fonts.bindings),
  };
  return handlers[kind] as MeasurementProofHandler<K> | null;
}
