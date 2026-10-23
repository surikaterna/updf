import assert from "node:assert/strict";
import test from "node:test";
import { ledger } from "../src/ledger.js";
import { type Atom, wrap } from "../src/wrap.js";
import { lineSelector } from "../src/wrap-selector.js";
import { sourceIndex } from "../src/source-index.js";
import { indexedSelector } from "../src/indexed-selector.js";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";

function input(text: string): Atom[] {
  let start = 0;
  return Array.from(text, (text, i) => {
    const atom: Atom = {
      text,
      start,
      end: start + text.length,
      runIndex: i % 2,
      path: "/runs/text",
      style: rectangular("").paragraphs[0]!.defaultStyle,
      metrics: { advance: 1, left: 0, right: 1, ascent: 1, descent: 0, top: -1, bottom: 0, empty: text === " " },
    };
    start = atom.end;
    return atom;
  });
}
test("blocked first token/scalar is nonconsuming; UTF16 scalar and cross-run identities survive retry", () => {
  for (const breakLongWords of ["error", "codePoint"] as const) {
    const atoms = input("😀ab\n\n");
    const p = rectangular("", { breakLongWords }).paragraphs[0]!;
    const selector = lineSelector(atoms, p, ledger(), "");
    const blocked = selector.next(0.5)!;
    assert.ok("blocked" in blocked);
    assert.equal(selector.done, false);
    const lines = [];
    while (!selector.done) lines.push(selector.next(3));
    assert.deepEqual(lines, wrap(atoms, 3, p, ledger(), ""));
    assert.deepEqual(lines[0] && "atoms" in lines[0] ? lines[0].atoms : [], atoms.slice(0, 3));
    assert.deepEqual([atoms[0]?.start, atoms[0]?.end, atoms[1]?.start], [0, 2, 2]);
  }
});
test("longword chunks use whole offered width, and a pending chunk is reconsidered at next width", () => {
  const atoms = input("ab abcdefgh");
  const p = rectangular("", { breakLongWords: "codePoint", whiteSpace: "collapse" }).paragraphs[0]!;
  const selector = lineSelector(atoms, p, ledger(), "");
  const text = (value: ReturnType<typeof selector.next>) =>
    value && "atoms" in value ? value.atoms.map((atom) => atom.text).join("") : assert.fail("Expected line");
  assert.equal(text(selector.next(5)), "ab");
  assert.equal(text(selector.next(3)), "abc");
  assert.equal(text(selector.next(5)), "defgh");
  assert.equal(selector.done, true);
});
test("variable width retains preserved/collapsed spaces, consecutive and trailing newline semantics", () => {
  for (const whiteSpace of ["preserve", "collapse"] as const) {
    const p = rectangular("", { whiteSpace, breakLongWords: "codePoint" }).paragraphs[0]!;
    const selector = lineSelector(input(" a  b\n\n😀c\n"), p, ledger(), "");
    const lines = [];
    while (!selector.done) lines.push(selector.next(lines.length === 0 ? 3 : 10));
    const selected = lines.flatMap((line) => (line && "atoms" in line ? line.atoms : assert.fail()));
    assert.equal(selected.map((atom) => atom.text).join(""), whiteSpace === "preserve" ? " a  b😀c" : "a b😀c");
    const last = lines.at(-1);
    assert.equal(last && "breakReason" in last ? last.breakReason : undefined, "paragraphEnd");
  }
});
test("single-pass grouping trims each hard segment and keeps atomic neighbors separate", () => {
  const atoms = input("  ab  \n  cd ef  \n  ").map((atom) => ({ ...atom, atomic: atom.text === "c" }));
  const p = rectangular("", { whiteSpace: "collapse", breakLongWords: "codePoint" }).paragraphs[0]!;
  const lines = wrap(atoms, 3, p, ledger(), "");
  assert.deepEqual(
    lines.map((line) => [line.atoms.map((atom) => atom.text).join(""), line.breakReason]),
    [
      ["ab", "hard"],
      ["cd", "soft"],
      ["ef", "hard"],
      ["", "paragraphEnd"],
    ],
  );
  assert.equal(lines[1]?.atoms[0], atoms[9]);
});
test("indexed source positions count surrogates and atomic visuals once, with legal direct resume", () => {
  const atoms = input("😀abc\n").map((atom) => (atom.text === "b" ? { ...atom, text: "", atomic: true } : atom));
  const p = rectangular("", { breakLongWords: "codePoint" }).paragraphs[0]!;
  const charges: number[] = [];
  const charge = (amount: number) => {
    charges.push(amount);
  };
  const selector = indexedSelector(lineSelector(atoms, p, ledger(), "", charge), "", charge);
  assert.deepEqual(selector.position(), { offset: 0, extent: 6 });
  const preparedCharges = [...charges];
  selector.fork().position();
  assert.deepEqual(charges, preparedCharges);
  const resumed = selector.resume(1);
  assert.deepEqual(charges.slice(preparedCharges.length), [1, 1]);
  const line = resumed.next(1)!;
  assert.ok("atoms" in line);
  assert.equal(line.atoms[0]?.start, 2);
  assert.equal(resumed.position().offset, 2);
  const visual = selector.resume(2).next(1)!;
  assert.ok("atoms" in visual);
  assert.equal(visual.atoms[0]?.atomic, true);
  assert.equal(selector.position().offset, 0);
  assert.equal(selector.resume(6).done, true);
});
test("source prefix safe-integer overflow rejects rather than retaining an inexact extent", () => {
  assert.throws(() => sourceIndex([Number.MAX_SAFE_INTEGER, 1], () => {}, "/source"));
});
