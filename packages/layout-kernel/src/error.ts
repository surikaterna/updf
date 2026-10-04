export type LayoutInputErrorCode = "TYPE" | "KEY" | "VALUE" | "LIMIT" | "GEOMETRY";

/** Kernel contract failure; host exceptions (including proxy traps) are not relabeled. */
export class LayoutInputError extends Error {
  readonly code: LayoutInputErrorCode;
  readonly path: string;

  constructor(code: LayoutInputErrorCode, path: string, message: string) {
    super(message);
    this.name = "LayoutInputError";
    this.code = code;
    this.path = path;
  }
}
export function fail(code: LayoutInputErrorCode, path: string, message: string): never {
  throw new LayoutInputError(code, path, message);
}
