import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import ts from "typescript";

// Raw packages/core/src/measurement/arithmetic.ts at
// e96d2741f8d4a5f3086e6b95ff61a5967db7e7f1; retained so CI/archives need no Git history.
export const originalArithmetic = `/** Compensated positive metric accumulation; nonfinite totals remain failures. */
export class MetricSum {
  private total = 0;
  private correction = 0;

  add(value: number): number {
    const next = this.total + value;
    if (!Number.isFinite(next)) {
      this.total = next;
      this.correction = 0;
      return next;
    }
    this.correction += Math.abs(this.total) >= Math.abs(value) ? this.total - next + value : value - next + this.total;
    this.total = next;
    return this.value;
  }

  get value(): number {
    return this.total + this.correction;
  }
}

export function sum(values: readonly number[]): number {
  const result = new MetricSum();
  for (const value of values) result.add(value);
  return result.value;
}

export function exceeds(actual: number, bound: number, operationScale = 0): boolean {
  if (!Number.isFinite(actual) || !Number.isFinite(bound) || !Number.isFinite(operationScale)) return true;
  if (actual <= bound) return false;
  // Two relative machine epsilons cover metric scaling and compensated addition,
  // not a point-sized allowance. Zero-edge ink uses its positioning operation's
  // scale, not an unrelated large box width for left-aligned glyphs.
  const scale = Math.max(Math.abs(actual), Math.abs(bound), Math.abs(operationScale));
  return actual - bound > scale * (2 * Number.EPSILON);
}
`;

function withoutStandaloneJSDoc(source: string): string {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, source, () => {
    assert.fail("Invalid source token in arithmetic certificate");
  });
  let result = "";
  let copied = 0;
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (token !== ts.SyntaxKind.MultiLineCommentTrivia || !scanner.getTokenText().startsWith("/**")) continue;
    const start = scanner.getTokenPos();
    const end = scanner.getTextPos();
    const lineStart = source.lastIndexOf("\n", start - 1) + 1;
    const indent = source.slice(lineStart, start);
    if (![...indent].every((character) => character === " " || character === "\t")) continue;
    if (source[end] !== "\n") continue;
    result += source.slice(copied, lineStart);
    copied = end + 1;
  }
  return result + source.slice(copied);
}

function executable(source: string): string {
  return ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, removeComments: true },
  }).outputText;
}

export function assertArithmeticPreserved(source: string): void {
  assert.equal(
    createHash("sha256").update(originalArithmetic).digest("hex"),
    "6c99483a778c69420c73b74c4745247479d484c4d6d0eacce1be1ed28b0dd620",
    "Pinned original arithmetic bytes",
  );
  assert.equal(withoutStandaloneJSDoc(source), withoutStandaloneJSDoc(originalArithmetic), "Non-JSDoc source bytes");
  // Comment line breaks can affect automatic semicolon insertion; byte filtering alone is not the proof.
  assert.equal(executable(source), executable(originalArithmetic), "Historical executable output");
}
