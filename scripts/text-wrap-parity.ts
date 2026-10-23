import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { ledger } from "../packages/text/src/ledger.js";
import { type Atom, wrap } from "../packages/text/src/wrap.js";
import type { ParagraphDefinition } from "../packages/text/src/types.js";

const style = { font: "Helvetica", fontSize: 10, color: [0, 0, 0] as const };
function input(text: string): Atom[] {
  let offset = 0;
  return Array.from(text, (text, i) => {
    const start = offset;
    offset += text.length;
    return {
      text,
      start,
      end: offset,
      runIndex: i % 3,
      style,
      path: "/text",
      metrics: {
        advance: 1,
        left: i % 7 === 0 ? -0.1 : 0,
        right: 1,
        ascent: 1,
        descent: 0,
        top: -1,
        bottom: 0,
        empty: text === " ",
      },
    };
  });
}
function widths(
  text: string,
  whiteSpace: ParagraphDefinition["whiteSpace"],
  breakLongWords: ParagraphDefinition["breakLongWords"],
) {
  return [1, 2, 3, 4, 7, 20].map((width) => {
    const paragraph: ParagraphDefinition = {
      runs: [],
      defaultStyle: style,
      lineHeight: 2,
      align: "left",
      whiteSpace,
      breakLongWords,
    };
    try {
      return wrap(input(text), width, paragraph, ledger(), "");
    } catch (error) {
      return JSON.parse(JSON.stringify(error));
    }
  });
}
function cases() {
  const result = [];
  for (const text of ["", "\n", "\n\n", "ab\n\n", " a  b ", "ab cd ef", "abcdefgh ij", "a😀b 😀cd\n", "ab\n cd\n\n"])
    for (const whiteSpace of ["collapse", "preserve"] as const)
      for (const breakLongWords of ["error", "codePoint"] as const)
        result.push(...widths(text, whiteSpace, breakLongWords));
  return result;
}
const paragraph: ParagraphDefinition = {
  runs: [],
  defaultStyle: style,
  lineHeight: 2,
  align: "left",
  whiteSpace: "collapse",
  breakLongWords: "codePoint",
};
const samples = [input("a ".repeat(4096)), input("a".repeat(8192))];
for (let i = 0; i < 50; i++) for (const atoms of samples) wrap(atoms, 127, paragraph, ledger(), "");
const times = [];
for (let round = 0; round < 9; round++) {
  const start = performance.now();
  for (let i = 0; i < 100; i++) for (const atoms of samples) wrap(atoms, 127, paragraph, ledger(), "");
  times.push(performance.now() - start);
}
const output = { cases: cases(), milliseconds: times };
const path = process.argv[2];
assert.ok(path, "Supply output artifact path");
const before = process.argv[3] ? JSON.parse(await readFile(process.argv[3], "utf8")) : undefined;
if (before) assert.deepEqual(output.cases, before.cases);
await writeFile(path, JSON.stringify(output));
console.log({ path, cases: output.cases.length, milliseconds: times, beforeMilliseconds: before?.milliseconds });
