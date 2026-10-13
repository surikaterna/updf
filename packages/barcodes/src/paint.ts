import type { PathCommand } from "@updf/core/painting";
import { h, type VNode } from "@updf/core/vdom";
import { exceeds } from "@updf/layout-boxes/arithmetic";
import { fail, metric, option } from "./checks.js";
import type { BarcodeBar, BarcodeSymbol } from "./symbol.js";

/** Point placement of a fixed-size symbol. maxWidth rejects overflow; it never rescales modules. */
export interface BarcodePlacement {
  readonly x: number;
  readonly y: number;
  readonly maxWidth?: number;
}

function rectangle(bar: BarcodeBar): readonly PathCommand[] {
  return [
    { type: "move", x: bar.x, y: bar.y },
    { type: "line", x: bar.x + bar.width, y: bar.y },
    { type: "line", x: bar.x + bar.width, y: bar.y + bar.height },
    { type: "line", x: bar.x, y: bar.y + bar.height },
    { type: "close" },
  ];
}

export function paintSymbol(value: BarcodeSymbol, props: BarcodePlacement): VNode {
  const x = metric(option(props, "x", undefined), "x", 0, 1e6);
  const y = metric(option(props, "y", undefined), "y", 0, 1e6);
  const maximum = option(props, "maxWidth", value.width);
  const width = metric(maximum, "maxWidth", Number.MIN_VALUE, 1e6);
  if (exceeds(value.width, width)) fail("GEOMETRY", "maxWidth", "Barcode does not fit; modules cannot shrink");
  return h("group", {
    x,
    y,
    children: [
      h("path", {
        commands: rectangle({ x: 0, y: 0, width: value.width, height: value.height }),
        paint: { fill: [1, 1, 1], stroke: null },
      }),
      h("path", { commands: value.bars.flatMap(rectangle), paint: { fill: [0, 0, 0], stroke: null } }),
    ],
  });
}
