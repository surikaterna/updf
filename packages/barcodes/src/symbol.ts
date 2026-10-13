/** Local top-left point rectangle, with no stroke. */
export interface BarcodeBar {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Immutable geometry; width/height include the white quiet zone. No font or SVG dependency. */
export interface BarcodeSymbol {
  readonly width: number;
  readonly height: number;
  readonly bars: readonly BarcodeBar[];
}

export function symbol(width: number, height: number, bars: BarcodeBar[]): BarcodeSymbol {
  return Object.freeze({ width, height, bars: Object.freeze(bars.map((bar) => Object.freeze(bar))) });
}
