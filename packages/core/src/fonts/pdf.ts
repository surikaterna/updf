import { literal, name } from "../core/pdf-values.js";
import type { PdfRef, PdfWriter } from "../core/pdf-writer.js";
import { type FontUsage, utf16hex } from "./cids.js";
import { writeProgram } from "./prepare.js";

function unicode(usage: FontUsage): string[] {
  const chunks = [
    "/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /PreparedUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <ffff>\nendcodespacerange\n",
  ];
  for (let i = 0; i < usage.glyphs.length; i += 100) {
    const part = usage.glyphs.slice(i, i + 100);
    chunks.push(`${part.length} beginbfchar\n`);
    part.forEach((glyph, j) => {
      chunks.push(`<${(i + j + 1).toString(16).padStart(4, "0")}> <${utf16hex(glyph.codePoint)}>\n`);
    });
    chunks.push("endbfchar\n");
  }
  chunks.push("endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n");
  return chunks;
}

function gidMap(usage: FontUsage): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array((usage.glyphs.length + 1) * 2);
  usage.glyphs.forEach((glyph, i) => {
    bytes[(i + 1) * 2] = glyph.glyphId >> 8;
    bytes[(i + 1) * 2 + 1] = glyph.glyphId & 255;
  });
  return bytes;
}

export function reserveFont(writer: PdfWriter) {
  return {
    font: writer.reserve(),
    descendant: writer.reserve(),
    descriptor: writer.reserve(),
    program: writer.reserve(),
    map: writer.reserve(),
    unicode: writer.reserve(),
  };
}

export function defineFont(writer: PdfWriter, usage: FontUsage, refs: ReturnType<typeof reserveFont>): void {
  const metadata = usage.font.metadata;
  const descriptor = metadata.descriptor;
  const scale = (unit: number): number => (unit / metadata.unitsPerEm) * 1000;
  const baseName = name(descriptor.postscriptName);
  writer.define(refs.font, {
    Type: name("Font"),
    Subtype: name("Type0"),
    BaseFont: baseName,
    Encoding: name("Identity-H"),
    DescendantFonts: [refs.descendant],
    ToUnicode: refs.unicode,
  });
  writer.define(refs.descendant, {
    Type: name("Font"),
    Subtype: name("CIDFontType2"),
    BaseFont: baseName,
    CIDSystemInfo: { Registry: literal("Adobe"), Ordering: literal("Identity"), Supplement: 0 },
    FontDescriptor: refs.descriptor,
    CIDToGIDMap: refs.map,
    DW: 0,
    W: [1, usage.glyphs.map((glyph) => scale(glyph.advance))],
  });
  defineDescriptor(writer, refs.descriptor, refs.program, usage);
  writeProgram(usage.font, writer, refs.program);
  writer.defineStream(refs.map, [gidMap(usage)]);
  writer.defineStream(refs.unicode, unicode(usage));
}

function defineDescriptor(writer: PdfWriter, ref: PdfRef, program: PdfRef, usage: FontUsage): void {
  const metadata = usage.font.metadata;
  const descriptor = metadata.descriptor;
  const scale = (unit: number): number => (unit / metadata.unitsPerEm) * 1000;
  writer.define(ref, {
    Type: name("FontDescriptor"),
    FontName: name(descriptor.postscriptName),
    Flags: descriptor.flags,
    FontBBox: descriptor.bounds.map(scale),
    ItalicAngle: descriptor.italicAngle,
    Ascent: scale(descriptor.ascent),
    Descent: scale(descriptor.descent),
    CapHeight: scale(descriptor.capHeight),
    StemV: descriptor.stemV,
    FontFile2: program,
  });
}
