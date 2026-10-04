import { readFile } from "node:fs/promises";
import { freightFontResources } from "../../../examples/business/freight-invoice-fonts.js";

export async function freightFonts() {
  const regular = new Uint8Array(await readFile(new URL("./LiberationSans-Regular.ttf", import.meta.url)));
  const bold = new Uint8Array(await readFile(new URL("./LiberationSans-Bold.ttf", import.meta.url)));
  return freightFontResources(regular, bold);
}
