import { collectFonts } from "../fonts/cids.js";
import { defineFont, reserveFont } from "../fonts/pdf.js";
import { collectAlpha } from "../painting/alpha.js";
import { commands } from "./content.js";
import { name } from "./pdf-values.js";
import { type PdfRef, PdfWriter } from "./pdf-writer.js";
import type { MeasuredPage } from "./plan.js";
import { type Policy, policy } from "./policy.js";

export function serialize(pages: readonly MeasuredPage[], limits: Policy = policy()): Uint8Array<ArrayBuffer> {
  const writer = new PdfWriter(limits.outputBytes);
  const catalog = writer.reserve();
  const tree = writer.reserve();
  const helvetica = writer.reserve();
  const pageRefs = pages.map(() => ({ page: writer.reserve(), content: writer.reserve() }));
  const fonts = collectFonts(pages);
  const fontRefs = fonts.map(() => reserveFont(writer));
  const alphas = collectAlpha(pages);
  const alphaRefs = alphas.map(() => writer.reserve());
  const resources = {
    Font: { F1: helvetica, ...Object.fromEntries(fonts.map((font, i) => [font.key, fontRefs[i]!.font])) },
    ...(alphas.length ? { ExtGState: Object.fromEntries(alphas.map((alpha, i) => [alpha.key, alphaRefs[i]!])) } : {}),
  };
  writer.define(catalog, { Type: name("Catalog"), Pages: tree });
  writer.define(tree, { Type: name("Pages"), Kids: pageRefs.map((refs) => refs.page), Count: pages.length });
  defineHelvetica(writer, helvetica);
  const budget = { length: 0, maximum: limits.outputBytes };
  pages.forEach((page, i) => {
    const refs = pageRefs[i]!;
    writer.define(refs.page, {
      Type: name("Page"),
      Parent: tree,
      MediaBox: [0, 0, page.width, page.height],
      Resources: resources,
      Contents: refs.content,
    });
    writer.defineStream(refs.content, commands(page, budget, fonts, alphas));
  });
  fonts.forEach((font, i) => {
    defineFont(writer, font, fontRefs[i]!);
  });
  alphas.forEach((alpha, i) => {
    writer.define(alphaRefs[i]!, {
      Type: name("ExtGState"),
      ca: alpha.fill,
      CA: alpha.stroke,
    });
  });
  return writer.seal(catalog);
}

function defineHelvetica(writer: PdfWriter, ref: PdfRef): void {
  writer.define(ref, {
    Type: name("Font"),
    Subtype: name("Type1"),
    BaseFont: name("Helvetica"),
    Encoding: name("WinAnsiEncoding"),
  });
}
