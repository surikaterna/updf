import { fail } from "../core/error.js";
import { fontLimits, pointer, record } from "./checks.js";
import { isPreparedFont } from "./prepare.js";
import type { PreparedFont } from "./types.js";

export type ResolvedFonts = ReadonlyMap<string, PreparedFont>;

export function resolveResources(options: unknown = {}): ResolvedFonts {
  record(options, "/options", ["resources"]);
  const result = new Map<string, PreparedFont>();
  if (!("resources" in options)) return result;
  const resources = options.resources;
  record(resources, "/resources");
  const ids = Object.keys(resources);
  if (ids.length > fontLimits.count) fail("LIMIT", "/resources", "Maximum 8 font resources");
  let bytes = 0;
  for (const id of ids) {
    const path = `/resources/${pointer(id)}`;
    if (id === "Helvetica" || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id))
      fail("FONT_RESOURCE", path, "Invalid or reserved font id");
    const font = resources[id];
    if (!isPreparedFont(font)) fail("FONT_RESOURCE", path, "Expected owned prepared font");
    bytes += font.metadata.byteLength;
    if (bytes > fontLimits.totalBytes) fail("LIMIT", "/resources", "Aggregate font bytes exceed 8 MiB");
    result.set(id, font);
  }
  return result;
}

export function selectedFont(id: unknown, fonts: ResolvedFonts, path: string): PreparedFont | undefined {
  if (id === undefined || id === "Helvetica") return undefined;
  if (typeof id !== "string") fail("FONT_RESOURCE", path, "Font reference must be a string");
  const font = fonts.get(id);
  if (!font) fail("FONT_RESOURCE", path, `Unknown font resource ${id}`);
  return font;
}
