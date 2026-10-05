import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

export function javascriptFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const file = join(dir, entry.name);
      return entry.isDirectory() ? javascriptFiles(file) : entry.name.endsWith(".js") ? [file] : [];
    });
}

export function compileLegacyCopy(source: string, output: string): void {
  mkdirSync(output, { recursive: true });
  for (const name of ["src", "test"]) cpSync(join(source, name), join(output, name), { recursive: true });
  const program = ts.createProgram(
    [...javascriptFiles(join(source, "src")), ...javascriptFiles(join(source, "test"))],
    {
      allowJs: true,
      checkJs: false,
      target: ts.ScriptTarget.ES2015,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      rootDir: source,
      outDir: output,
      skipLibCheck: true,
      types: [],
    },
  );
  const diagnostics = [...program.getSyntacticDiagnostics(), ...program.getOptionsDiagnostics()];
  const emitted = program.emit();
  if (diagnostics.length || emitted.emitSkipped) throw new Error("Legacy disposable compilation failed");
}
