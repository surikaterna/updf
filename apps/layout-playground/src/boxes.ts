import { type BoxLayout, type BoxStyle, type BoxView, layoutBoxes } from "@updf/layout-kernel/boxes";
import { PlaygroundError } from "./error.js";

export interface SourceNode {
  readonly id: string;
  readonly path: string;
  readonly style: BoxStyle;
  readonly children: readonly SourceNode[];
}
export interface Controls {
  readonly width: number;
  readonly height: number;
  readonly gap: number;
  readonly padding: number;
  readonly align: "start" | "center" | "end" | "stretch";
  readonly direction: "row" | "column";
  readonly pageCap: number;
  readonly text: string;
  readonly preset: "boxes" | "pdf";
  readonly paginate: boolean;
}
export const view: BoxView<SourceNode, never> = Object.freeze({
  id: (node: SourceNode) => node.id,
  path: (node: SourceNode) => node.path,
  style: (node: SourceNode) => node.style,
  childCount: (node: SourceNode) => node.children.length,
  childAt: (node: SourceNode, index: number) => node.children[index] as SourceNode,
  content: () => undefined,
});

export function node(id: string, style: BoxStyle, children: readonly SourceNode[] = []): SourceNode {
  return Object.freeze({ id, path: `/${id}`, style: Object.freeze(style), children: Object.freeze(children) });
}

export function validateControls(c: Controls): void {
  for (const [key, value, min, max] of [
    ["width", c.width, 120, 800],
    ["height", c.height, 18, 1200],
    ["gap", c.gap, 0, 40],
    ["padding", c.padding, 0, 30],
    ["pageCap", c.pageCap, 1, 20],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < min || value > max) {
      throw new PlaygroundError("VALUE", `/${key}`, `integer ${min}–${max} required (PDF points; no rounding)`);
    }
  }
  if (c.direction === "column" && c.align !== "start")
    throw new PlaygroundError("VALUE", "/align", "column supports start only");
}

export function prepareBoxes(c: Controls): { readonly root: SourceNode; readonly layout: BoxLayout<never> } {
  const children = [node("A", { height: 36 }), node("B", { height: 54 }), node("C", { height: 24 })];
  const root = node(
    "root",
    {
      flexDirection: c.direction,
      gap: c.gap,
      alignItems: c.align,
      paddingTop: c.padding,
      paddingRight: c.padding,
      paddingBottom: c.padding,
      paddingLeft: c.padding,
    },
    children,
  );
  return Object.freeze({ root, layout: layoutBoxes({ root, view, width: c.width }) });
}

export function prepareRow(c: Controls): { readonly root: SourceNode; readonly layout: BoxLayout<never> } {
  const root = node(
    "atomic-row",
    {
      flexDirection: "row",
      gap: c.gap,
      alignItems: c.align,
      paddingTop: c.padding,
      paddingRight: c.padding,
      paddingBottom: c.padding,
      paddingLeft: c.padding,
    },
    [node("row-A", { height: 36 }), node("row-B", { height: 54 })],
  );
  return Object.freeze({ root, layout: layoutBoxes({ root, view, width: c.width }) });
}
