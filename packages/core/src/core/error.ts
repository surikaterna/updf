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

export const limits = Object.freeze({
  pages: 20,
  nodes: 10000,
  text: 4096,
  totalText: 100000,
  bytes: 10 * 1024 * 1024,
});
