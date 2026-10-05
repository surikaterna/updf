export type LineHeight = number | "normal" | { readonly unit: "pt"; readonly value: number };
export interface InlineLineHeights {
  readonly strut: LineHeight;
  readonly runs?: readonly LineHeight[];
}
export interface LineEnvelope {
  readonly above: number;
  readonly below: number;
  readonly height: number;
}
