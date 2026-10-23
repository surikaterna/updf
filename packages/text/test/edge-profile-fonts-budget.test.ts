import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createPreparedFont, fontRuntime } from "@updf/fonts";
import { createTextComposition } from "@updf/text/composition";
import { compositionOptions, createLayoutOperation } from "../../../tests/fixtures/text-flow/options.js";
import { fontInput } from "../../../tests/fixtures/fonts/font-fixture.js";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";
import { profileExclusion, profileInterval } from "../src/profile-exclusion.js";
import { MetricSum, sum } from "../src/arithmetic.js";
import { selectProfileLine } from "../src/composition-profile.js";
import { lineSelector } from "../src/wrap-selector.js";
import { type Atom, wrap } from "../src/wrap.js";
import { ledger } from "../src/ledger.js";

function failureCode(invoke: () => unknown) {
  try {
    invoke();
    assert.fail("Expected failure");
  } catch (error) {
    assert.ok(error instanceof DocumentError);
    return error.diagnostics[0]?.code;
  }
}
test("mixed fonts with negative bearings, overhang and advances stay outside both sloped silhouettes", async () => {
  const data = await fontInput(),
    original = createPreparedFont(data);
  const glyph = original.metadata.glyphs.find((entry) => entry.codePoint === 65)!;
  const Demo = createPreparedFont({ ...data, glyphs: [{ ...glyph, advance: 600, bounds: [-200, -500, 900, 1400] }] });
  for (const side of ["left", "right"] as const) {
    const operation = createLayoutOperation(compositionOptions({ Demo }));
    const exclusion = {
      shape: "edge-profile",
      side,
      top: 3,
      points: [
        { x: 25, y: 0 },
        { x: 8, y: 48 },
        { x: 20, y: 96 },
      ],
    } as const;
    try {
      const input = rectangular(
        "",
        {
          lineHeight: 24,
          breakLongWords: "codePoint",
          runs: [
            { text: "AAAA", style: { font: "Demo", fontSize: 14 } },
            { text: "AB CD", style: { fontSize: 12 } },
          ],
        },
        60,
      );
      const frame = operation.composeText({ ...input, maxHeight: 200, exclusion });
      const profile = profileExclusion(exclusion, 60, "", () => {});
      assert.ok(frame.measurement.lineCount >= 2);
      frame.measurement.lines.forEach((line) => {
        const region = profileInterval(profile, 60, line.top, [0, line.height], "", () => {});
        for (const fragment of line.fragments) {
          assert.ok(fragment.x >= region.origin);
          assert.ok(fragment.x + fragment.advance <= region.origin + region.width);
          if (fragment.inkBounds.empty) continue;
          assert.ok(fragment.inkBounds.left >= region.origin);
          assert.ok(fragment.inkBounds.right <= region.origin + region.width);
        }
      });
    } finally {
      operation.close();
    }
  }
});
test("fractional candidate gaps preserve the compensated height owner across subsequent paragraphs", () => {
  const operation = createLayoutOperation(compositionOptions());
  try {
    const paragraph = rectangular(
      "A\nA",
      { lineHeight: 0.1, defaultStyle: { font: "Helvetica", fontSize: 0.01, color: [0, 0, 0] } },
      60,
    ).paragraphs[0]!;
    const frame = operation.composeText({
      width: 60,
      maxHeight: 21,
      paragraphs: Array(100).fill(paragraph),
      exclusion: {
        shape: "edge-profile",
        side: "left",
        points: [
          { x: 60, y: 0 },
          { x: 60, y: 0.3 },
        ],
      },
    });
    const first = frame.measurement.lines[0]!.top;
    assert.equal(first, sum([0.1, 0.1, 0.1]));
    frame.measurement.lines.forEach((line, index) => {
      assert.equal(line.top, sum(Array(index + 3).fill(0.1)));
    });
    assert.equal(frame.height, sum(Array(203).fill(0.1)));
  } finally {
    operation.close();
  }
});
test("actual baseline-associated vertical overhang activates a profile beyond the nominal line box", () => {
  const base = fontRuntime();
  const runtime = {
    ...base,
    measure(...args: Parameters<typeof base.measure>) {
      const metrics = base.measure(...args);
      return metrics.empty ? metrics : { ...metrics, top: metrics.top - 8, bottom: metrics.bottom + 8 };
    },
  };
  const options = { ...compositionOptions(), ...createTextComposition({ runtime, defaultFont: "Helvetica" }) };
  const operation = createLayoutOperation(options);
  try {
    const frame = operation.composeText({
      ...rectangular("\nA\n", {}, 60),
      maxHeight: 100,
      exclusion: {
        shape: "edge-profile",
        side: "left",
        top: 34,
        points: [
          { x: 20, y: 0 },
          { x: 20, y: 2 },
        ],
      },
    });
    const line = frame.measurement.lines[1]!;
    assert.ok(line.baseline < 34 && line.top + line.height < 34);
    assert.ok(!line.inkBounds.empty && line.inkBounds.bottom > 34);
    assert.equal(line.fragments[0]!.x, 20);
  } finally {
    operation.close();
  }
});
function atoms(text: string): Atom[] {
  let start = 0;
  return Array.from(text, (text) => {
    const atom = {
      text,
      start,
      end: start + text.length,
      runIndex: 0,
      path: "",
      atomic: text === "😀",
      style: rectangular("").paragraphs[0]!.defaultStyle,
      metrics: {
        advance: text === "😀" ? 2 : 1,
        left: 0,
        right: text === "😀" ? 2 : 1,
        ascent: 1,
        descent: 0,
        top: -1,
        bottom: 0,
        empty: text === " ",
      },
    };
    start = atom.end;
    return atom;
  });
}
test("profile retries preserve Unicode/atomic source identity, whitespace and hard/trailing break semantics", () => {
  const source = atoms("😀 a  b\n\n😀c\n");
  for (const whiteSpace of ["preserve", "collapse"] as const) {
    const paragraph = rectangular("", { whiteSpace, breakLongWords: "codePoint" }).paragraphs[0]!;
    const input = { width: 20, maxHeight: 1000, paragraphs: [paragraph] };
    const selector = lineSelector(source, paragraph, ledger(), ""),
      height = new MetricSum();
    const profile = profileExclusion(
      {
        shape: "edge-profile",
        side: "left",
        points: [
          { x: 20, y: 0 },
          { x: 20, y: 17 },
        ],
      },
      20,
      "",
      () => {},
    );
    const lines = [];
    while (!selector.done) {
      const choice = selectProfileLine(selector, height, 16, input, profile, [0, 16], "", () => {});
      lines.push(choice.selected);
      height.add(16);
    }
    assert.deepEqual(lines, wrap(source, 20, paragraph, ledger(), ""));
    assert.equal(lines[0]!.atoms[0], source[0]);
    assert.deepEqual([source[0]!.start, source[0]!.end], [0, 2]);
    assert.equal(height.value, 32 + lines.length * 16);
  }
});
test("long blocked profiles and massive vertex inputs hit the existing cumulative LIMIT, including failed calls", () => {
  const operation = createLayoutOperation({ ...compositionOptions(), limits: { nodes: 500 } });
  const input = {
    ...rectangular("AB", {}, 60),
    maxHeight: 1e12,
    exclusion: {
      shape: "edge-profile",
      side: "left",
      points: [
        { x: 60, y: 0 },
        { x: 60, y: 1e12 },
      ],
    },
  } as const;
  try {
    assert.equal(
      failureCode(() => operation.composeText(input)),
      "LIMIT",
    );
    assert.equal(
      failureCode(() => operation.composeText({ ...input, paragraphs: [] })),
      "LIMIT",
    );
  } finally {
    operation.close();
  }
  const vertices = createLayoutOperation({ ...compositionOptions(), limits: { nodes: 200 } });
  try {
    const points = Array.from({ length: 5000 }, (_, y) => ({ x: 1, y }));
    assert.equal(
      failureCode(() => vertices.composeText({ ...input, exclusion: { ...input.exclusion, points } })),
      "LIMIT",
    );
  } finally {
    vertices.close();
  }
});
test("repeated failed vertical-overflow calls retain profile scan and advance work", () => {
  const operation = createLayoutOperation({ ...compositionOptions(), limits: { nodes: 600 } });
  const input = {
    ...rectangular("AB", {}, 60),
    maxHeight: 0,
    exclusion: {
      shape: "edge-profile",
      side: "left",
      points: [
        { x: 60, y: 0 },
        { x: 1, y: 100 },
      ],
    },
  } as const;
  let failures = 0;
  try {
    for (; failures < 20; failures++) {
      const code = failureCode(() => operation.composeText(input));
      if (code === "LIMIT") break;
      assert.equal(code, "VERTICAL_OVERFLOW");
    }
    assert.ok(failures > 0 && failures < 20);
    assert.equal(
      failureCode(() => operation.composeText(input)),
      "LIMIT",
    );
  } finally {
    operation.close();
  }
});
