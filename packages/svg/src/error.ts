import type { DiagnosticCode, DocumentDiagnostic, SourceSpan } from "@updf/core";
import { DocumentError } from "@updf/core";

/** Fatal SVG failure with frozen diagnostics and original-source UTF-16 spans. */
export class SVGError extends DocumentError {
  override readonly diagnostics: readonly DocumentDiagnostic[];
  constructor(code: DiagnosticCode, path: string, message: string, span?: SourceSpan) {
    super(code, path, message);
    this.name = "SVGError";
    this.diagnostics = Object.freeze([
      Object.freeze({ code, path, message, ...(span ? { span: Object.freeze({ ...span }) } : {}) }),
    ]);
  }
}
export function svgFail(code: DiagnosticCode, path: string, message: string, span?: SourceSpan): never {
  throw new SVGError(code, path, message, span);
}
export function mapped(error: unknown, path: string, span?: SourceSpan): never {
  if (error instanceof SVGError) throw error;
  if (error instanceof DocumentError) {
    const diagnostic = error.diagnostics[0];
    if (diagnostic) svgFail(diagnostic.code, `${path}${diagnostic.path}`, diagnostic.message, span);
  }
  svgFail("SVG_GEOMETRY", path, error instanceof Error ? error.message : "SVG conversion failed", span);
}
