import { DocumentError } from "@updf/core/internal";
import { AssetError } from "@updf/assets";

function sourcePath(path: string, source: string): string {
  if (path === "/document" || path.startsWith("/document/")) return path;
  const local = path.replace(/^\/(?:source|images\/(?:load|loader\/resolve|src|cache))(?=\/|$)/u, "");
  return `${source}${local}`;
}

/** Clone known structured failures per caller; shared sessions never capture occurrence paths. */
export function occurrenceError(error: unknown, source: string): unknown {
  if (error instanceof AssetError) return new AssetError(error.code, sourcePath(error.path, source), error.message);
  if (!(error instanceof DocumentError) || !error.diagnostics.length) return error;
  const diagnostics = error.diagnostics.map((diagnostic) => {
    const clone = new DocumentError(
      diagnostic.code,
      sourcePath(diagnostic.path, source),
      diagnostic.message,
      diagnostic,
    );
    return clone.diagnostics[0]!;
  });
  const first = diagnostics[0]!;
  const clone = new DocumentError(first.code, first.path, error.message, first);
  Object.defineProperty(clone, "diagnostics", { value: diagnostics });
  return clone;
}
