import { type BoxAllocation, type BoxLayout, type BoxStyle, type BoxView, layoutBoxes } from "@updf/layout-boxes/boxes";
import { bits, dyadic } from "@updf/layout-boxes/numeric";
import type { Row } from "./profile.js";

interface Root {
  readonly kind: "root";
}
interface RowRef {
  readonly kind: "row";
  readonly row: Row;
}
interface CellRef {
  readonly kind: "cell";
  readonly row: Row;
  readonly index: number;
}
interface Footer {
  readonly kind: "footer";
  readonly lines: readonly string[];
}
type Ref = Root | RowRef | CellRef | Footer;
type Content = CellRef | Footer;
export interface TerminalBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly lines: readonly string[];
}
const unit = dyadic(bits(1));

export function cells(allocation: BoxAllocation) {
  if (allocation.exactStart === undefined || allocation.exactEnd === undefined)
    throw new Error("Exact inline allocation required");
  const start = Number(allocation.exactStart / unit),
    end = Number(allocation.exactEnd / unit);
  return { start, width: end - start };
}
function id(node: Ref): string {
  if (node.kind === "root" || node.kind === "footer") return node.kind;
  return node.kind === "row" ? `row:${node.row.id}` : `cell:${node.row.id}:${node.index}`;
}
function style(node: Ref): BoxStyle {
  if (node.kind === "row") return { flexDirection: "row", gap: node.row.texts.length === 2 ? 1 : 0 };
  if (node.kind !== "cell" || node.row.texts.length !== 2) return {};
  return node.index === 0
    ? { flexGrow: 1, flexBasis: 0, minWidth: 8, maxWidth: 24 }
    : { flexGrow: 2, flexBasis: 0, minWidth: 12, maxWidth: 100 };
}
/** Lightweight references to validated host rows, never a copied FSX tree. */
export function terminalLayout(
  content: readonly Row[],
  footerLines: readonly string[],
  width: number,
  wrap: (text: string, width: number) => readonly string[],
) {
  const root: Root = { kind: "root" };
  const footer: Footer = { kind: "footer", lines: footerLines };
  const measured = new Map<string, readonly string[]>();
  const view: BoxView<Ref, Content> = {
    id,
    path: (node) => `/tui/${id(node)}`,
    style,
    childCount: (node) => (node.kind === "root" ? content.length + 1 : node.kind === "row" ? node.row.texts.length : 0),
    childAt: (node, index) => {
      if (node.kind === "root") {
        const row = content[index];
        return row ? { kind: "row", row } : footer;
      }
      if (node.kind !== "row") throw new Error("Leaf child request");
      return { kind: "cell", row: node.row, index };
    },
    content: (node) => (node.kind === "cell" || node.kind === "footer" ? node : undefined),
  };
  const layout = layoutBoxes({
    root: root as Ref,
    view,
    width,
    exactInlineEdges: true,
    limits: { nodes: 256, depth: 4, childCalls: 255, measurements: 128 },
    measure: (node, context) => {
      const projected = cells(context.allocation);
      const lines = node.kind === "footer" ? node.lines : wrap(node.row.texts[node.index] ?? "", projected.width);
      measured.set(context.path, lines);
      return { height: lines.length };
    },
  });
  return project(layout, measured);
}
function project(layout: BoxLayout<Content>, measured: ReadonlyMap<string, readonly string[]>) {
  const positions: number[] = [];
  const boxes: TerminalBox[] = [];
  layout.boxes.forEach((box, index) => {
    const y = (box.parentIndex === null ? 0 : (positions[box.parentIndex] ?? 0)) + box.top;
    positions[index] = y;
    if (box.content === undefined) return;
    const projected = cells(box.allocation),
      lines = measured.get(box.path);
    if (!lines || !Number.isInteger(y)) throw new Error("Missing integer-cell measurement");
    boxes.push(Object.freeze({ x: projected.start, y, width: projected.width, lines }));
  });
  return { boxes: Object.freeze(boxes), height: layout.boxes[0]?.height ?? 0 };
}
