import type { Component } from "@updf/core/vdom";
import { fail, metric, option, payload, record } from "./checks.js";
import { checksum, pattern } from "./code39-patterns.js";
import { type BarcodePlacement, paintSymbol } from "./paint.js";
import { type BarcodeBar, type BarcodeSymbol, symbol } from "./symbol.js";
export type { BarcodeBar, BarcodeSymbol } from "./symbol.js";

/** Basic Code 39, uppercase only, at most 80 payload characters. No implicit normalization. */
export interface Code39Options {
  /** Narrow module in points, 0.25..10; default 1. */
  readonly moduleWidth?: number;
  /** Bar height in points, 1..1000; default 40. */
  readonly barHeight?: number;
  /** Wide:narrow ratio, exactly 2 or 3; default 3. */
  readonly wideRatio?: 2 | 3;
  /** Optional modulo-43 check character; default none. */
  readonly checksum?: "none" | "mod43";
}
const keys = ["moduleWidth", "barHeight", "wideRatio", "checksum"];

function geometry(value: string, unit: number, height: number, ratio: number): BarcodeSymbol {
  const quiet = Math.max(18, 10 * unit);
  const bars: BarcodeBar[] = [];
  let cursor = 0;
  for (const character of value) {
    const bits = pattern(character);
    for (let element = 0; element < 9; element++) {
      const width = bits & (1 << (8 - element)) ? ratio : 1;
      if (element % 2 === 0) bars.push({ x: quiet + cursor * unit, y: 0, width: width * unit, height });
      cursor += width;
    }
    cursor++;
  }
  return symbol(2 * quiet + (cursor - 1) * unit, height, bars);
}

/** Encode and measure a symbol, including at least 10 modules/18 points of quiet zone at each side. */
export function code39(value: string, options: Code39Options = {}): BarcodeSymbol {
  record(options, keys);
  const data = payload(value, 80, /[^0-9A-Z. $/+%\-]/u);
  const unit = metric(option(options, "moduleWidth", 1), "moduleWidth", 0.25, 10);
  const height = metric(option(options, "barHeight", 40), "barHeight", 1, 1000);
  const ratio = option(options, "wideRatio", 3);
  if (ratio !== 2 && ratio !== 3) fail("VALUE", "wideRatio", "Expected 2 or 3");
  const check = option(options, "checksum", "none");
  if (check !== "none" && check !== "mod43") fail("VALUE", "checksum", "Expected none or mod43");
  return geometry(`*${data}${check === "mod43" ? checksum(data) : ""}*`, unit, height, ratio);
}

export interface Code39Props extends Code39Options, BarcodePlacement {
  readonly value: string;
}

/** Native fixed-document TSX component. Opaque white quiet zone, black vector bars, no text/font dependency. */
export const Code39: Component<Code39Props> = (props) => {
  record(props, ["value", "x", "y", "maxWidth", ...keys]);
  const options: Record<string, unknown> = {};
  for (const key of keys) if (Object.hasOwn(props, key)) options[key] = option(props, key, undefined);
  return paintSymbol(code39(option(props, "value", undefined) as string, options), props);
};
