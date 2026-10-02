import { type PdfObject, stream } from "../core/bytes.js";
import { decimal as n, name, value } from "../core/pdf-values.js";
import { type FontUsage, utf16hex } from "./cids.js";
import { copyProgram } from "./prepare.js";

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

export function fontObjects(usage: FontUsage, base: number): readonly PdfObject[] {
  const metadata = usage.font.metadata;
  const descriptor = metadata.descriptor;
  const scale = (unit: number): string => n((unit / metadata.unitsPerEm) * 1000);
  const baseName = value(name(descriptor.postscriptName));
  const widths = usage.glyphs.map((glyph) => scale(glyph.advance)).join(" ");
  return [
    [
      `<< /Type /Font /Subtype /Type0 /BaseFont ${baseName} /Encoding /Identity-H /DescendantFonts [${base + 1} 0 R] /ToUnicode ${base + 5} 0 R >>`,
    ],
    [
      `<< /Type /Font /Subtype /CIDFontType2 /BaseFont ${baseName} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${base + 2} 0 R /CIDToGIDMap ${base + 4} 0 R /DW 0 /W [1 [${widths}]] >>`,
    ],
    [
      `<< /Type /FontDescriptor /FontName ${baseName} /Flags ${descriptor.flags} /FontBBox [${descriptor.bounds.map(scale).join(" ")}] /ItalicAngle ${n(descriptor.italicAngle)} /Ascent ${scale(descriptor.ascent)} /Descent ${scale(descriptor.descent)} /CapHeight ${scale(descriptor.capHeight)} /StemV ${n(descriptor.stemV)} /FontFile2 ${base + 3} 0 R >>`,
    ],
    stream([copyProgram(usage.font)], ` /Length1 ${metadata.byteLength}`),
    stream([gidMap(usage)]),
    stream(unicode(usage)),
  ];
}
