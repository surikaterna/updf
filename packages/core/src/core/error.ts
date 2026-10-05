import type { DiagnosticCode, DocumentDiagnostic } from "../types.js";

/** Structured validation/rendering failure; inspect codes and paths rather than parsing messages. */
export class DocumentError extends Error {
  /** Readonly diagnostic view; the array itself is not a deep-frozen result contract. */
  readonly diagnostics: readonly DocumentDiagnostic[];

  /** Construct one diagnostic; optional source-span metadata is copied and frozen. */
  constructor(code: DiagnosticCode, path: string, message: string, metadata: Pick<DocumentDiagnostic, "span"> = {}) {
    super(message);
    this.name = "DocumentError";
    this.diagnostics = [
      { code, path, message, ...(metadata.span ? { span: Object.freeze({ ...metadata.span }) } : {}) },
    ];
  }
}

export function fail(code: DiagnosticCode, path: string, message: string): never {
  throw new DocumentError(code, path, message);
}
