// Regular Helvetica Adobe standard-font widths, in 1/1000 em, ASCII 32..126.
// Legacy src/font/helvetica.js rounds these to 1/100 em; retain the full
// precision here so measurement matches unkerned WinAnsi Helvetica Tj operators.
const widths = Object.freeze([
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556,
  556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334,
  260, 334, 584,
]);

// AFM extrema of the supported WinAnsi ASCII glyphs, not font Ascender/Descender.
// dollar/bar reach 775; bar reaches -225. Their union fits exactly one em.
export const inkAscent = 0.775;

export function textWidth(text: string, fontSize: number): number {
  let units = 0;
  for (const char of text) {
    const width = widths[char.charCodeAt(0) - 32];
    if (width === undefined) throw new Error("Unvalidated character in measurement");
    units += width;
  }
  return (units / 1000) * fontSize;
}
