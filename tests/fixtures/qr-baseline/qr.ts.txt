import type { Component } from "@updf/core/vdom";
import qrcode from "qrcode-generator";
import { fail, metric, option, payload, record } from "./checks.js";
import { type BarcodePlacement, paintSymbol } from "./paint.js";
import { type BarcodeBar, type BarcodeSymbol, symbol } from "./symbol.js";
export type { BarcodeBar, BarcodeSymbol } from "./symbol.js";

/** Bounded QR Model 2 byte mode: printable ASCII, 1..192 bytes, level M, automatic versions 1..10. */
export interface QROptions {
  /** Square module in points, 0.25..10; default 2. Four quiet modules on every side. */
  readonly moduleSize?: number;
}

function matrixBars(matrix: ReturnType<typeof qrcode>, unit: number): BarcodeBar[] {
  const count = matrix.getModuleCount();
  const bars: BarcodeBar[] = [];
  for (let row = 0; row < count; row++) {
    let column = 0;
    while (column < count) {
      const start = column;
      if (!matrix.isDark(row, column++)) continue;
      while (column < count && matrix.isDark(row, column)) column++;
      bars.push({ x: (start + 4) * unit, y: (row + 4) * unit, width: (column - start) * unit, height: unit });
    }
  }
  return bars;
}

/** Generate immutable vector runs; never asks the QR dependency to produce SVG, canvas, HTML or images. */
export function qrCode(value: string, options: QROptions = {}): BarcodeSymbol {
  record(options, ["moduleSize"]);
  const data = payload(value, 192, /[^\x20-\x7e]/u);
  const unit = metric(option(options, "moduleSize", 2), "moduleSize", 0.25, 10);
  const matrix = qrcode(0, "M");
  matrix.addData(data, "Byte");
  matrix.make();
  const count = matrix.getModuleCount();
  if (count < 21 || count > 57) fail("LIMIT", "value", "QR version outside the bounded profile");
  const size = (count + 8) * unit;
  return symbol(size, size, matrixBars(matrix, unit));
}

export interface QRCodeProps extends QROptions, BarcodePlacement {
  readonly value: string;
}

/** Native fixed-document TSX component; white quiet zone and square black modules, with no resampling. */
export const QRCode: Component<QRCodeProps> = (props) => {
  record(props, ["value", "x", "y", "maxWidth", "moduleSize"]);
  const options = Object.hasOwn(props, "moduleSize")
    ? { moduleSize: option(props, "moduleSize", undefined) as number }
    : {};
  return paintSymbol(qrCode(option(props, "value", undefined) as string, options), props);
};
