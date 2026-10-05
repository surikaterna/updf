import assert from "node:assert/strict";
import ts from "typescript";

function typeOnlyExport(declaration: ts.Declaration): boolean {
  if (!ts.isExportSpecifier(declaration)) return false;
  return declaration.isTypeOnly || declaration.parent.parent.isTypeOnly;
}

export function valueExports(program: ts.Program, source: ts.SourceFile): string[] {
  const checker = program.getTypeChecker();
  const module = checker.getSymbolAtLocation(source);
  assert.ok(module, `Missing checked module: ${source.fileName}`);
  return checker
    .getExportsOfModule(module)
    .filter((symbol) => {
      if (symbol.declarations?.some(typeOnlyExport)) return false;
      const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      return Boolean(target.flags & ts.SymbolFlags.Value);
    })
    .map((symbol) => symbol.name)
    .sort();
}
