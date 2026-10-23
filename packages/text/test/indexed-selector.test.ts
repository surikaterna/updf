import assert from "node:assert/strict";
import test from "node:test";
import { indexedSelector } from "../src/indexed-selector.js";
import { ledger } from "../src/ledger.js";
import { lineSelector } from "../src/wrap-selector.js";
import type { Atom } from "../src/wrap.js";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";

function atoms(text: string, style: Atom["style"]): Atom[] {
  let start = 0;
  return Array.from(text, (text) => {
    const atom: Atom = {
      text: text === "#" ? "" : text,
      atomic: text === "#",
      start,
      end: start + text.length,
      runIndex: 0,
      path: "/source",
      style,
      metrics: { advance: 1, left: 0, right: 1, ascent: 1, descent: 0, top: -1, bottom: 0, empty: text === " " },
    };
    start = atom.end;
    return atom;
  });
}

function probe(selector: ReturnType<typeof lineSelector>, indexed: ReturnType<typeof indexedSelector>, offset: number) {
  const reference = selector.fork();
  let remaining = offset;
  let index = 0;
  while (index < reference.source.length) {
    const size = reference.source[index]?.atoms.length ?? 1;
    if (remaining < size) break;
    remaining -= size;
    index++;
  }
  const unit = reference.source[index];
  if (remaining && (reference.paragraph.breakLongWords !== "codePoint" || unit?.atoms[0]?.atomic)) {
    assert.throws(() => indexed.resume(offset));
    return;
  }
  reference.index = index;
  reference.offset = remaining;
  reference.cached = undefined;
  for (const width of [0.5, 1, 2, 5]) {
    const resumed = indexed.resume(offset);
    assert.deepEqual(resumed.position(), { offset, extent: indexed.position().extent });
    const plain = reference.fork();
    assert.deepEqual(resumed.next(width), plain.next(width));
    assert.equal(resumed.done, plain.done);
    assert.deepEqual(resumed.fork().next(3), plain.fork().next(3));
  }
}

function probeSource(text: string, paragraph: ReturnType<typeof rectangular>["paragraphs"][number]) {
  const selector = lineSelector(atoms(text, paragraph.defaultStyle), paragraph, ledger(), "");
  const charges: number[] = [];
  const indexed = indexedSelector(selector, "", (n) => {
    charges.push(n);
  });
  assert.equal(charges.length, selector.source.length);
  const extent = indexed.position().extent;
  for (let offset = 0; offset <= extent; offset++) probe(selector, indexed, offset);
  assert.deepEqual(indexed.position(), { offset: 0, extent });
  return extent + 1;
}

test("optional index differential: all retained offsets of 2500 sources preserve the sole wrapping policy", (t) => {
  const alphabet = ["a", " ", "\n", "😀", "#"];
  let sources = 0;
  let probes = 0;
  for (const whiteSpace of ["collapse", "preserve"] as const) {
    for (const breakLongWords of ["error", "codePoint"] as const) {
      const paragraph = rectangular("", { whiteSpace, breakLongWords }).paragraphs[0]!;
      for (let n = 0; n < 625; n++) {
        const text = Array.from({ length: 4 }, (_, i) => alphabet[Math.floor(n / 5 ** i) % 5]).join("");
        probes += probeSource(text, paragraph);
        sources++;
      }
    }
  }
  assert.equal(sources, 2500);
  assert.ok(probes > 10000);
  t.diagnostic(`${sources} sources, ${probes} offset probes, four widths per legal position`);
});
