import { DocumentError, fail } from "@updf/core/internal";
import { byteLength, createPreparedFont, type PreparedFont } from "@updf/fonts";
import { create } from "fontkit";
import { preparedData } from "./metadata.js";
import { inspectSfnt } from "./sfnt.js";

/**
 * Prepare static single-face glyf TrueType bytes for core's simple LTR text profile.
 * Importing this optional adapter loads its Fontkit peer; core does not load it.
 * Accepts at most 4 MiB and copies bytes before parsing; the returned core-owned
 * PreparedFont is reusable across documents, with frozen metadata and no close step.
 * No shaping, bidi, fallback or subsetting is performed. TTC/WOFF/CFF, variable,
 * color and bitmap fonts are rejected. Embedding rights are checked, not granted.
 * Throws DocumentError for byte/format/metrics/rights failures. Use trusted fonts:
 * byte limits and structural checks are not a malicious-font or CPU sandbox.
 */
export function prepareFont(bytes: Uint8Array<ArrayBuffer>): PreparedFont {
  byteLength(bytes, "/font/bytes", 4 * 1024 * 1024);
  const owned = new Uint8Array(bytes);
  try {
    const rights = inspectSfnt(owned);
    // Preserve program bytes even if the parser were to mutate its input copy.
    const parsed: unknown = create(new Uint8Array(owned));
    return createPreparedFont(preparedData(parsed, owned, rights));
  } catch (error: unknown) {
    if (error instanceof DocumentError) throw error;
    fail(
      "FONT_FORMAT",
      "/font/bytes",
      `Fontkit parsing/metrics failed: ${error instanceof Error ? error.message : "unknown failure"}`,
    );
  }
}
