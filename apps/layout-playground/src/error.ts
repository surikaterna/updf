export class PlaygroundError extends Error {
  constructor(
    readonly code: string,
    readonly path: string,
    message: string,
  ) {
    super(message);
    this.name = "PlaygroundError";
  }
}

export function errorDescription(error: unknown): string {
  if (error instanceof Error) {
    const code = "code" in error ? String(error.code) : "COMPUTATION";
    const path = "path" in error ? String(error.path) : "/";
    return `${code} ${path}: ${error.message}`;
  }
  return `COMPUTATION /: ${String(error)}`;
}
