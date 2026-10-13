import type { Component } from "@updf/core/vdom";
import { fail, metric, option, payload, record } from "./checks.js";
import { type BarcodePlacement, paintSymbol } from "./paint.js";
import { encodeQR, type QRMatrix } from "./qr-encoder/encoder.js";
import { type BarcodeBar, type BarcodeSymbol, symbol } from "./symbol.js";
export type { BarcodeBar, BarcodeSymbol } from "./symbol.js";

/** Bounded QR Model 2 byte mode: printable ASCII, automatic versions 1..10, correction M or H. */
export interface QROptions {
  /** Square module in points, 0.25..10; default 2. Four quiet modules on every side. */
  readonly moduleSize?: number;
  /** M (default): at most 192 bytes. H: at most 119 bytes. Never silently lowers correction to fit. */
  readonly errorCorrection?: "M" | "H";
}
const keys = ["moduleSize", "errorCorrection"];

function matrixBars(matrix: QRMatrix, unit: number): BarcodeBar[] {
  const count = matrix.size;
  const bars: BarcodeBar[] = [];
  for (let row = 0; row < count; row++) {
    let column = 0;
    while (column < count) {
      const start = column;
      if (!matrix.cells[row * count + column++]) continue;
      while (column < count && matrix.cells[row * count + column]) column++;
      bars.push({ x: (start + 4) * unit, y: (row + 4) * unit, width: (column - start) * unit, height: unit });
    }
  }
  return bars;
}

/** Generate immutable vector runs from the dependency-free encoder, with no image/SVG intermediate. */
export function qrCode(value: string, options: QROptions = {}): BarcodeSymbol {
  record(options, keys);
  const level = option(options, "errorCorrection", "M");
  if (level !== "M" && level !== "H") fail("VALUE", "errorCorrection", "Expected M or H");
  const data = payload(value, level === "H" ? 119 : 192, /[^\x20-\x7e]/u);
  const unit = metric(option(options, "moduleSize", 2), "moduleSize", 0.25, 10);
  const matrix = encodeQR(data, level);
  const size = (matrix.size + 8) * unit;
  return symbol(size, size, matrixBars(matrix, unit));
}

export interface QRCodeProps extends QROptions, BarcodePlacement {
  readonly value: string;
}

/** Native fixed-document TSX component; white quiet zone and square black modules, with no resampling. */
export const QRCode: Component<QRCodeProps> = (props) => {
  record(props, ["value", "x", "y", "maxWidth", ...keys]);
  const options: Record<string, unknown> = {};
  for (const key of keys) if (Object.hasOwn(props, key)) options[key] = option(props, key, undefined);
  return paintSymbol(qrCode(option(props, "value", undefined) as string, options), props);
};
