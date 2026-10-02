import { fail } from "../core/error.js";
import { glyphFor } from "./prepare.js";
import type { PreparedFont, PreparedGlyph } from "./types.js";

export function scalar(char: string, path: string): number {
  const code = char.codePointAt(0);
  if (code === undefined || (code >= 0xd800 && code <= 0xdfff))
    fail("CHARACTER", path, "Invalid Unicode scalar/surrogate");
  if (code >= 32 && code <= 126) return code;
  if (/\p{Mark}|\p{Control}|\p{Format}/u.test(char))
    fail(
      "FONT_PROFILE",
      path,
      "Combining, control, bidi, joiner and variation sequences require shaping and are unsupported",
    );
  if (/\p{Script=Latin}|\p{Script=Cyrillic}/u.test(char)) return code;
  if (
    /\p{Script=Common}/u.test(char) &&
    /\p{Punctuation}|\p{Space_Separator}|\p{Currency_Symbol}|\p{Math_Symbol}|\p{Number}/u.test(char)
  )
    return code;
  fail("FONT_PROFILE", path, "Only simple LTR Latin/Cyrillic and common punctuation/spacing are supported");
}

export function validateCharacters(text: string, font: PreparedFont | undefined, path: string): void {
  if (!font) {
    if (/[^\x20-\x7e\n]/u.test(text))
      fail("CHARACTER", path, "Only printable ASCII and LF are supported without a prepared font");
    return;
  }
  for (const char of text) {
    if (char !== "\n") glyphFor(font, scalar(char, path), path);
  }
}

export function glyphRun(text: string, font: PreparedFont, path: string): readonly PreparedGlyph[] {
  return Array.from(text, (char) => glyphFor(font, scalar(char, path), path));
}
