import { type BoxLayout, type BoxStyle, type BoxView, layoutBoxes } from "@updf/layout-boxes/boxes";
import { cells, type TerminalBox } from "./box-bridge.js";
import { ascii, type ProofSnapshot, type Row, rows, windowSize } from "./profile.js";
import { raster, wrap } from "./terminal.js";

export interface MenuFormData {
  readonly snapshot: ProofSnapshot;
  readonly menu: readonly string[];
  readonly buttons: readonly string[];
}
type Group = "root" | "menu" | "form" | "buttons";
type Ref =
  | { readonly kind: Group }
  | { readonly kind: "field"; readonly row: Row }
  | { readonly kind: "text"; readonly id: string; readonly text: string; readonly style: BoxStyle };
type TextRef = Extract<Ref, { kind: "text" }>;

function id(node: Ref): string {
  if (node.kind === "text") return node.id;
  return node.kind === "field" ? `field:${node.row.id}` : node.kind;
}
function style(node: Ref): BoxStyle {
  if (node.kind === "text") return node.style;
  if (node.kind === "root") return { flexDirection: "row", gap: 2 };
  if (node.kind === "menu") return { width: 8 };
  if (node.kind === "form") return { flexGrow: 1, flexBasis: 0, minWidth: 14, gap: 1 };
  return { flexDirection: "row", gap: 1 };
}
function text(id: string, value: string, style: BoxStyle = {}): TextRef {
  return { kind: "text", id, text: ascii(value), style };
}
function children(node: Ref, data: MenuFormData, fields: readonly Row[]): readonly Ref[] {
  if (node.kind === "root") return [{ kind: "menu" }, { kind: "form" }];
  if (node.kind === "menu") return data.menu.map((value, i) => text(`menu:${i}`, value));
  if (node.kind === "form") return [...fields.map((row): Ref => ({ kind: "field", row })), { kind: "buttons" }];
  if (node.kind === "buttons")
    return data.buttons.map((value, i) => text(`button:${i}`, value, { flexGrow: 1, flexBasis: 0, minWidth: 6 }));
  if (node.kind !== "field") return [];
  return node.row.texts.map((value, i) =>
    text(
      `field:${node.row.id}:${i}`,
      value,
      node.row.texts.length === 1 ? {} : i === 0 ? { width: 5 } : { minWidth: 8 },
    ),
  );
}
function viewFor(data: MenuFormData): BoxView<Ref, TextRef> {
  const fields = rows(data.snapshot, "");
  const refs = new Map<Ref, readonly Ref[]>();
  const read = (node: Ref) => {
    let result = refs.get(node);
    if (!result) {
      result = children(node, data, fields);
      refs.set(node, result);
    }
    return result;
  };
  return {
    id,
    path: (node) => `/menu-form/${id(node)}`,
    style,
    childCount: (node) => read(node).length,
    childAt: (node, index) => {
      const child = read(node)[index];
      if (!child) throw new Error("Invalid host child index");
      return child;
    },
    content: (node) => (node.kind === "text" ? node : undefined),
  };
}
function project(layout: BoxLayout<TextRef>, measured: ReadonlyMap<string, readonly string[]>) {
  const positions: number[] = [];
  const boxes: (TerminalBox & { readonly id: string })[] = [];
  layout.boxes.forEach((box, index) => {
    const y = (box.parentIndex === null ? 0 : (positions[box.parentIndex] ?? 0)) + box.top;
    positions[index] = y;
    if (!box.content) return;
    const projected = cells(box.allocation);
    const lines = measured.get(box.path);
    if (!lines || !Number.isInteger(y)) throw new Error("Missing integer-cell measurement");
    boxes.push({ id: box.id, x: projected.start, y, width: projected.width, lines });
  });
  return boxes;
}

/** Synchronous cell-unit geometry over host data; references are not a document/VDOM copy. */
export function menuForm(data: MenuFormData, width: number, height = 20) {
  windowSize(width, height);
  if (data.menu.length > 8 || data.buttons.length < 1 || data.buttons.length > 4)
    throw new Error("Menu/button budget exceeded");
  const measured = new Map<string, readonly string[]>();
  const layout = layoutBoxes({
    root: { kind: "root" } as Ref,
    view: viewFor(data),
    width,
    exactInlineEdges: true,
    limits: { nodes: 256, depth: 5, childCalls: 255, measurements: 128 },
    measure: (node, context) => {
      const lines = wrap(node.text, cells(context.allocation).width);
      measured.set(context.path, lines);
      return { height: lines.length };
    },
  });
  const naturalHeight = layout.boxes[0]?.height ?? 0;
  if (naturalHeight > height) throw new Error("Bounds overflow; clipping is forbidden");
  const boxes = project(layout, measured);
  return { layout, boxes, height: naturalHeight, body: raster(boxes, width, naturalHeight) };
}
