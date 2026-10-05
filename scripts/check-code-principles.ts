import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export interface PrincipleDiagnostic {
  rule: "max-lines" | "max-lines-per-function" | "max-depth";
  line: number;
  message: string;
}

const excludedDirectory =
  /^(?:node_modules|dist|dist-.*|build|out|artifacts|archive|snapshots|__snapshots__|generated-reports)$/;

export function isPrinciplePath(path: string): boolean {
  const parts = path.split("/");
  return (
    /^(?:packages|apps|tests|scripts|examples)\//.test(path) &&
    /\.tsx?$/.test(path) &&
    !path.startsWith("packages/legacy/") &&
    !parts.slice(0, -1).some((part) => excludedDirectory.test(part))
  );
}

function isFunction(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

function isInvokedExpression(node: ts.Node): boolean {
  if (!ts.isFunctionExpression(node) && !ts.isArrowFunction(node)) return false;
  let expression: ts.Node = node;
  while (ts.isParenthesizedExpression(expression.parent)) expression = expression.parent;
  return ts.isCallExpression(expression.parent) && expression.parent.expression === expression;
}

function addsDepth(node: ts.Node): boolean {
  if (ts.isIfStatement(node)) {
    return !(ts.isIfStatement(node.parent) && node.parent.elseStatement === node);
  }
  return (
    ts.isSwitchStatement(node) ||
    ts.isTryStatement(node) ||
    ts.isDoStatement(node) ||
    ts.isWhileStatement(node) ||
    ts.isWithStatement(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node)
  );
}

function functionStart(node: ts.FunctionLikeDeclaration, source: ts.SourceFile): number {
  // ESTree excludes export/default modifiers from functions, but includes method modifiers and decorators.
  const modifiers = ts.getModifiers(node);
  if (!ts.isFunctionDeclaration(node) || !modifiers?.length) return node.getStart(source);
  const lastExport = modifiers
    .filter(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword || modifier.kind === ts.SyntaxKind.DefaultKeyword,
    )
    .at(-1);
  if (!lastExport) return node.getStart(source);
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, source.languageVariant, source.text);
  scanner.setTextPos(lastExport.end);
  scanner.scan();
  return scanner.getTokenPos();
}

export function checkSource(text: string, path = "probe.ts"): PrincipleDiagnostic[] {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const diagnostics: PrincipleDiagnostic[] = [];
  const lineAt = (position: number) => source.getLineAndCharacterOfPosition(position).line + 1;
  const lines = text.split(/\r\n|[\n\r\u2028\u2029]/);
  const count = lines.length - (lines.length > 1 && lines.at(-1) === "" ? 1 : 0);
  if (count > 400)
    diagnostics.push({ rule: "max-lines", line: 401, message: `File has ${count} lines; maximum is 400.` });

  function visit(node: ts.Node, enclosingDepth: number): void {
    const resetsDepth = isFunction(node) || ts.isClassStaticBlockDeclaration(node);
    const depth = (resetsDepth ? 0 : enclosingDepth) + (addsDepth(node) ? 1 : 0);
    if (depth > 3 && addsDepth(node)) {
      diagnostics.push({
        rule: "max-depth",
        line: lineAt(node.getStart(source)),
        message: `Nesting is ${depth}; maximum is 3.`,
      });
    }
    if (isFunction(node) && node.body && !isInvokedExpression(node)) {
      const line = lineAt(functionStart(node, source));
      const length = lineAt(node.end - 1) - line + 1;
      if (length >= 50) {
        diagnostics.push({
          rule: "max-lines-per-function",
          line,
          message: `Function has ${length} lines; maximum is 49.`,
        });
      }
    }
    ts.forEachChild(node, (child) => visit(child, depth));
  }
  visit(source, 0);
  return diagnostics;
}

export function checkWorktree(root: string): number {
  // Git supplies tracked and untracked paths without traversing ignored output.
  const paths = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    cwd: root,
    encoding: "utf8",
  }).split("\0");
  let failures = 0;
  for (const path of new Set(paths.filter(isPrinciplePath))) {
    if (!existsSync(resolve(root, path))) continue;
    const diagnostics = checkSource(readFileSync(resolve(root, path), "utf8"), path);
    for (const diagnostic of diagnostics) {
      console.error(`${path}:${diagnostic.line}: ${diagnostic.rule}: ${diagnostic.message}`);
    }
    failures += diagnostics.length;
  }
  return failures;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = checkWorktree(process.cwd()) > 0 ? 1 : 0;
}
