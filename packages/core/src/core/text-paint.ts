import { decimal as n, name, type PdfString, value } from "./pdf-values.js";
import { type PageResources, paintingSlot } from "./resource-types.js";
import { finite } from "./schema.js";

export const textSlot = paintingSlot<PdfString>("Font");

export function textCommand(
  site: { readonly path: string },
  x: number,
  y: number,
  fontSize: number,
  height: number,
  local: boolean,
  resources: PageResources,
): string {
  finite(x, `${site.path}/x`);
  const paintedY = finite(local ? y : height - y, `${site.path}/y`);
  const { key, payload } = resources.painting(site, textSlot);
  const position = local ? `1 0 0 -1 ${n(x)} ${n(paintedY)}` : `1 0 0 1 ${n(x)} ${n(paintedY)}`;
  return `BT ${value(name(key))} ${n(fontSize)} Tf ${position} Tm ${value(payload)} Tj ET\n`;
}
