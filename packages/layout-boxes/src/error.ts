/** Input shape, unknown key, value domain, budget, or infeasible geometry failure. */
export type LayoutInputErrorCode = "TYPE" | "KEY" | "VALUE" | "LIMIT" | "GEOMETRY";

/** Kernel contract failure; host exceptions (including proxy traps) are not relabeled. */
export class LayoutInputError extends Error {
  readonly code: LayoutInputErrorCode;
  /** JSON-pointer path rooted at the caller's diagnostic prefix. */
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
