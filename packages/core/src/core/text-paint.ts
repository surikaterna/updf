import { decimal as n, name, type PdfString, value } from "./pdf-values.js";
import { type PageResources, paintingSlot } from "./resource-types.js";

export const textSlot = paintingSlot<PdfString>("Font");

export function textCommand(
  site: object,
  x: number,
  y: number,
  fontSize: number,
  height: number,
  local: boolean,
  resources: PageResources,
): string {
  const { key, payload } = resources.painting(site, textSlot);
  const position = local ? `1 0 0 -1 ${n(x)} ${n(y)}` : `1 0 0 1 ${n(x)} ${n(height - y)}`;
  return `BT ${value(name(key))} ${n(fontSize)} Tf ${position} Tm ${value(payload)} Tj ET\n`;
}
