import { fail } from "@updf/core/internal";
import type { PreparedBlock } from "./protocol.js";

export interface SourceProvenance {
  readonly start: number;
  readonly end: number;
  readonly index: number;
  readonly path: string;
  readonly key: string | number | null;
}
/** Trusted producers snapshot compact intervals, never one metadata entry per scalar. */
export function sourceProvenance(entries: readonly SourceProvenance[], extent: number): readonly SourceProvenance[] {
  let offset = 0;
  const result = entries.map((entry) => {
    if (
      entry.start !== offset ||
      !Number.isSafeInteger(entry.end) ||
      entry.end <= offset ||
      !Number.isSafeInteger(entry.index) ||
      entry.index < 0 ||
      typeof entry.path !== "string" ||
      !(entry.key === null || typeof entry.key === "string" || typeof entry.key === "number")
    )
      fail("TYPE", "/provenance", "Expected contiguous owned source intervals");
    offset = entry.end;
    return Object.freeze({ ...entry });
  });
  if (offset !== extent) fail("TYPE", "/provenance", "Source intervals must cover extent");
  return Object.freeze(result);
}
export function provenanceAt(item: PreparedBlock, offset: number, path: string): string {
  return (
    item.provenance?.find((entry) => entry.start <= offset && offset < entry.end)?.path ??
    `${path}${item.sourcePaths?.[offset] ?? ""}`
  );
}
export function provenanceRange(item: PreparedBlock, start: number, end: number) {
  if (!item.provenance)
    return {
      range: { start: item.sourceExtent === 0 ? 0 : start, end: item.sourceExtent === 0 ? 0 : end },
      keys: item.sourceKeys?.slice(start, end),
    };
  const entries = item.provenance.filter((entry) => entry.start < end && entry.end > start);
  return {
    index: entries[0]!.index,
    path: entries[0]!.path,
    range: { start: entries[0]!.index, end: entries.at(-1)!.index + 1 },
    keys: entries.map((entry) => entry.key),
  };
}
