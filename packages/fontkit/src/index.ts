import type { PreparedFont } from "@updf/core/fonts";
import { createPreparedFont } from "@updf/core/fonts";
import { byteLength, DocumentError, fail } from "@updf/core/internal";
import { create } from "fontkit";
import { preparedData } from "./metadata.js";
import { inspectSfnt } from "./sfnt.js";

/** Optional parser entry only. Static single-face glyf TrueType, no layout/shaping. */
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
