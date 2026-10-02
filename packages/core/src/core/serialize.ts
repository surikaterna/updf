import { collectFonts } from "../fonts/cids.js";
import { fontObjects } from "../fonts/pdf.js";
import { collectAlpha } from "../painting/alpha.js";
import { assemble, chunkLength, type PdfObject, stream } from "./bytes.js";
import { commands } from "./content.js";
import { fail, limits } from "./error.js";
import { decimal as n, name, value } from "./pdf-values.js";
import type { MeasuredPage } from "./plan.js";

function objects(pages: readonly MeasuredPage[]): PdfObject[] {
  const result: PdfObject[] = [];
  const budget = { length: 0 };
  const fonts = collectFonts(pages);
  const alphas = collectAlpha(pages);
  const fontBase = 4 + pages.length * 2;
  const alphaBase = fontBase + fonts.length * 6;
  const alphaRefs = alphas.length
    ? ` /ExtGState <<${alphas.map((alpha, i) => ` /${alpha.key} ${alphaBase + i} 0 R`).join("")} >>`
    : "";
  const refs = fonts.map((font, i) => ` /${font.key} ${fontBase + i * 6} 0 R`).join("");
  const kids = pages.map((_, i) => `${4 + i * 2} 0 R`).join(" ");
  result.push(["<< /Type /Catalog /Pages 2 0 R >>"]);
  result.push([`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`]);
  result.push([
    `<< /Type /Font /Subtype /Type1 /BaseFont ${value(name("Helvetica"))} /Encoding ${value(name("WinAnsiEncoding"))} >>`,
  ]);
  pages.forEach((page, i) => {
    result.push([
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(page.width)} ${n(page.height)}] /Resources << /Font << /F1 3 0 R${refs} >>${alphaRefs} >> /Contents ${5 + i * 2} 0 R >>`,
    ]);
    result.push(stream(commands(page, budget, fonts, alphas)));
  });
  fonts.forEach((font, i) => {
    // Reserve program bytes before the defensive serializer copy allocation.
    if (budget.length + font.font.metadata.byteLength > limits.bytes)
      fail("LIMIT", "", "PDF font output exceeds 10 MiB");
    const parts = fontObjects(font, fontBase + i * 6);
    budget.length += parts.reduce(
      (sum, object) => sum + object.reduce((size, chunk) => size + chunkLength(chunk), 0),
      0,
    );
    if (budget.length > limits.bytes) fail("LIMIT", "", "PDF output exceeds 10 MiB");
    result.push(...parts);
  });
  for (const alpha of alphas) result.push([`<< /Type /ExtGState /ca ${n(alpha.fill)} /CA ${n(alpha.stroke)} >>`]);
  return result;
}

export function serialize(pages: readonly MeasuredPage[]): Uint8Array<ArrayBuffer> {
  return assemble(objects(pages));
}
