import type { DiagnosticCode, DocumentDiagnostic } from "../types.js";

export class DocumentError extends Error {
  readonly diagnostics: readonly DocumentDiagnostic[];

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
