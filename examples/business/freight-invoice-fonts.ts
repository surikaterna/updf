import { prepareFont } from "@updf/fontkit";

export function freightFontResources(regular: Uint8Array<ArrayBuffer>, bold: Uint8Array<ArrayBuffer>) {
  return Object.freeze({ FreightRegular: prepareFont(regular), FreightBold: prepareFont(bold) });
}
