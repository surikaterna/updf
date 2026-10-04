import { DocumentError } from "@updf/core";
import { jsx } from "@updf/core/jsx-runtime";
import { type MeasureContext, resolveWidths, type WidthResolution } from "@updf/layout";
import { error } from "./checks.js";
import { Head } from "./parts.js";
import type { ResolvedTableInput, TableColumn } from "./types.js";

const allocations = new WeakMap<object, ResolvedTableInput["columns"]>();
export function retainAllocation(columns: ResolvedTableInput["columns"], context: MeasureContext): object {
  const part = context.readParts(jsx(Head, { children: [] }), [Head])[0];
  if (!part) error(context.sourcePath, "Missing allocation ownership scope");
  allocations.set(part.content, columns);
  return part.content;
}
export function hasAllocation(value: unknown): value is object {
  return !!value && typeof value === "object" && allocations.has(value);
}
export function reuseAllocation(value: object, context: MeasureContext): ResolvedTableInput["columns"] {
  const columns = allocations.get(value);
  if (!columns) error(context.sourcePath, "Expected owned column allocation");
  // Opening the empty capture enforces operation ownership without expanding caller content.
  context.readParts(value as Parameters<MeasureContext["readParts"]>[0], []);
  context.chargeSourceWork(columns.length, "/props/columns");
  return columns;
}

export function resolveColumns(input: readonly TableColumn[], context: MeasureContext): ResolvedTableInput["columns"] {
  const path = `${context.sourcePath}/props/columns`;
  context.chargeSourceWork(input.length, "/props/columns");
  let resolution: WidthResolution;
  try {
    resolution = resolveWidths(
      {
        availableWidth: context.width,
        tracks: input.map((column) => column.width),
        maxTracks: input.length,
      },
      path,
    );
  } catch (cause) {
    if (!(cause instanceof DocumentError)) throw cause;
    const diagnostic = cause.diagnostics[0];
    if (!diagnostic) throw cause;
    throw new DocumentError(
      diagnostic.code,
      diagnostic.path.replace(/\/tracks\/(\d+)/u, "/$1/width").replace(/\/tracks$/u, ""),
      diagnostic.message,
    );
  }
  const columns = Object.freeze(
    input.map((column, index) =>
      Object.freeze({
        ...column,
        width: resolvedWidth(resolution, index, path),
      }),
    ),
  );
  const total = columns.reduce((sum, column) => sum + column.width, 0);
  // Preserve scalar placement association; reject rather than silently clip rounding overflow.
  if (total > context.width) error(path, "Materialized table exceeds available width", "GEOMETRY");
  return columns;
}
function resolvedWidth(resolution: WidthResolution, index: number, path: string): number {
  const width = resolution.widths[index];
  if (width === undefined) error(path, "Missing resolved column");
  return width;
}
