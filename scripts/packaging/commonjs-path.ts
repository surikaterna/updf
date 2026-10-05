import path from "node:path";
import type ts from "typescript";

export function commonJSOutputPath(
  source: Pick<ts.SourceFile, "fileName" | "isDeclarationFile">,
  root: string,
  out: string,
  paths: Pick<typeof path, "relative" | "isAbsolute" | "sep" | "join"> = path,
): string | undefined {
  if (source.isDeclarationFile) return undefined;
  const relative = paths.relative(root, source.fileName);
  if (!relative || relative === ".." || relative.startsWith(`..${paths.sep}`) || paths.isAbsolute(relative))
    return undefined;
  return paths.join(out, "cjs", relative.replace(/\.ts$/u, ".js"));
}
