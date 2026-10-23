import assert from "node:assert/strict";
import test from "node:test";
import { prepareBand, queryBand, type BandSource } from "../src/inline-band.js";
import { inlineEnvelope, type InlineLineHeights } from "../src/line-height.js";
import { line } from "../src/lines.js";
import { ledger } from "../src/ledger.js";
import type { ResolvedTextResources } from "../src/text-resources.js";
import type { Atom, WrappedLine } from "../src/wrap.js";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";

const style = (size: number, font = "a") => ({ font, fontSize: size, color: [0, 0, 0] as const });
function resources(): ResolvedTextResources {
  return {
    bindings: new Map([
      ["a", {} as never],
      ["b", {} as never],
    ]),
    runtime: {
      validateResource() {},
      validateText() {},
      lineMetrics(_font, size) {
        return { ascent: size * 0.8, descent: size * 0.3 };
      },
      measure(_font, text, size) {
        return {
          advance: 0,
          left: 0,
          right: 0,
          ascent: size * 0.8,
          descent: size * 0.3,
          top: -size * 1.2,
          bottom: size * 0.6,
          empty: text === "",
          run: {} as never,
        };
      },
      joinRuns() {
        return {} as never;
      },
    },
  };
}
function fixture(scale: number, height: BandSource["height"]): BandSource {
  const paragraph = rectangular("", {
    defaultStyle: style(scale),
    lineHeight: 16 * scale,
    whiteSpace: "preserve",
    runs: [
      { text: "A A", style: style(2 * scale) },
      { text: "\n", style: style(scale / 2, "b") },
      { text: "" },
      { text: " ", style: style(scale * 3) },
    ],
  }).paragraphs[0]!;
  const atoms: Atom[] = [0, 0, 1, 2, 3].map((runIndex, index) => {
    const atomic = runIndex === 2;
    const atomStyle = atomic ? paragraph.defaultStyle : paragraph.runs[runIndex]!.style!;
    const size = atomStyle.fontSize!;
    return {
      runIndex,
      text: atomic ? "" : index === 2 ? "\n" : index === 4 ? " " : "A",
      start: index,
      end: index + 1,
      path: "/oracle",
      style: atomStyle as Atom["style"],
      atomic,
      metrics: {
        advance: 0,
        left: 0,
        right: 0,
        ascent: size * 0.8,
        descent: size * 0.3,
        top: -size * 1.2,
        bottom: size * 0.6,
        empty: index === 2 || index === 4,
        run: {} as never,
      },
    };
  });
  return { paragraph, height, atoms, fonts: resources() };
}
function assertSelected(source: BandSource, selected: readonly Atom[], top: number) {
  const certificate = prepareBand(source, () => {}, "");
  const band = queryBand(certificate, top, "");
  const wrapped: WrappedLine = { atoms: selected, breakReason: "paragraphEnd" };
  const explicit =
    typeof source.height === "boolean"
      ? undefined
      : inlineEnvelope(wrapped, source.paragraph, source.height, source.fonts, "");
  for (const y of [0, top]) {
    const actual = line(
      wrapped,
      source.paragraph,
      0,
      y,
      1e301,
      source.fonts,
      ledger(),
      "",
      !!source.height,
      explicit,
    ).publicLine;
    const translate = y === 0 ? top : 0;
    assert.ok(band.top <= top && band.bottom >= top + actual.height);
    if (actual.inkBounds.empty) continue;
    assert.ok(band.top <= translate + actual.inkBounds.top);
    assert.ok(band.bottom >= translate + actual.inkBounds.bottom);
  }
}
test("band encloses actual line owner for every ordered subset, including repeated runs, empty and visual atoms", () => {
  for (const scale of [1e-300, 1, 1e300]) {
    const heights: readonly BandSource["height"][] = [
      false,
      true,
      { strut: "normal" },
      { strut: 0.1 },
      { strut: { unit: "pt", value: scale }, runs: [0.1, "normal", 3, { unit: "pt", value: 8 * scale }] },
    ];
    for (const height of heights) {
      const source = fixture(scale, height);
      for (let mask = 0; mask < 2 ** source.atoms.length; mask++) {
        const selected = source.atoms.filter((_, index) => mask & (1 << index));
        assertSelected(source, selected, 0);
        assertSelected(source, selected, 64 * scale);
      }
    }
  }
});

test("plain empty arrays and tiny struts keep finite retry progress despite baseline cancellation", () => {
  for (const value of [Number.MIN_VALUE, 1e-300, 1e-16]) {
    const height: InlineLineHeights = { strut: { unit: "pt", value } };
    const source = { ...fixture(1, height), atoms: [] };
    for (const top of [0, 1e20, 1e300]) {
      const band = queryBand(
        prepareBand(source, () => {}, ""),
        top,
        "",
      );
      assert.equal(band.nominalHeight, value);
      assert.ok(band.nextTop > top);
    }
    assertSelected(source, [], 0);
  }
});

test("boolean baselines enclose direct-top and top-zero translated ink at unrelated coordinate scales", () => {
  for (const height of [false, true]) {
    const source = fixture(1, height);
    for (const top of [Number.MIN_VALUE, 1e-300, 0.1, 2 ** 54, 1e300]) {
      assertSelected(source, source.atoms, top);
      assertSelected(source, [], top);
    }
  }
});

test("certificate scans charge every atom and distinct participant only once per preparation", () => {
  const source = fixture(1, { strut: "normal" });
  let count = 0;
  const certificate = prepareBand(
    source,
    (n) => {
      count += n;
    },
    "",
  );
  assert.equal(count, source.atoms.length + 1 + 4);
  queryBand(certificate, 0, "");
  queryBand(certificate, 1, "");
  assert.equal(count, 10);
});
