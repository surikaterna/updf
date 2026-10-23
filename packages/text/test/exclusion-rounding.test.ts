import assert from "node:assert/strict";
import test from "node:test";
import { fontRuntime } from "@updf/fonts";
import { createTextComposition } from "@updf/text/composition";
import { compositionOptions, createLayoutOperation } from "../../../tests/fixtures/text-flow/options.js";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";
import { sum } from "../src/arithmetic.js";

const smallStyle = { font: "Helvetica", fontSize: 0.01, color: [0, 0, 0] as const };

test("inactive exclusions preserve compensated fractional height across paragraphs", () => {
  const operation = createLayoutOperation(compositionOptions());
  try {
    for (const text of ["", "A"]) {
      const paragraph = rectangular(text, { lineHeight: 0.1, defaultStyle: smallStyle }, 60).paragraphs[0]!;
      const input = { width: 60, maxHeight: 20, paragraphs: Array(200).fill(paragraph) };
      const ordinary = operation.composeText(input);
      const excluded = operation.composeText({
        ...input,
        exclusion: { shape: "rect", side: "left", width: 20, top: 1000, height: 1 },
      });
      assert.equal(excluded.height, 20);
      assert.deepEqual(excluded.measurement, ordinary.measurement);
    }
  } finally {
    operation.close();
  }
});

test("post-jump fractional lines keep one compensated height across paragraph boundaries", () => {
  const operation = createLayoutOperation(compositionOptions());
  try {
    const paragraph = rectangular("A\nA", { lineHeight: 0.1, defaultStyle: smallStyle }, 60).paragraphs[0]!;
    const frame = operation.composeText({
      width: 60,
      maxHeight: 20.3,
      paragraphs: Array(100).fill(paragraph),
      exclusion: { shape: "rect", side: "left", width: 60, height: 0.3 },
    });
    assert.equal(frame.height, 20.3);
    assert.equal(frame.measurement.lines[0]?.top, 0.3);
    frame.measurement.lines.forEach((line, index) => {
      assert.equal(line.top, sum([0.3, ...Array(index).fill(0.1)]));
    });
  } finally {
    operation.close();
  }
});

function scaledRuntime(scale: number) {
  const base = fontRuntime();
  return {
    ...base,
    measure(...args: Parameters<typeof base.measure>) {
      const metrics = base.measure(...args);
      return {
        ...metrics,
        ascent: 0.2 * scale,
        descent: 0.3 * scale,
        ...(!metrics.empty ? { top: -0.2 * scale, bottom: 8.1 * scale } : {}),
      };
    },
  };
}

test("selection encloses actual associated baseline ink at adversarial and mixed scales", () => {
  for (const [scale, top] of [
    [1e-8, 0],
    [1, 0],
    [1e8, 0],
    [1, 1e8],
    [1e8, 1e10],
  ] as const) {
    const runtime = scaledRuntime(scale);
    const operation = createLayoutOperation({ ...compositionOptions(), ...createTextComposition({ runtime }) });
    try {
      const baseline = top + 0.2 * scale + (16 * scale - sum([0.2 * scale, 0.3 * scale])) / 2;
      const bottom = baseline + 8.1 * scale;
      const edge = scale === 1 && top === 0 ? 16.049999999999997 : bottom - Math.abs(bottom) * Number.EPSILON;
      const input = rectangular(
        "A\n",
        { lineHeight: 16 * scale, defaultStyle: { ...smallStyle, fontSize: 10 * scale } },
        60 * scale,
      );
      const prefix = top ? rectangular("", { lineHeight: top }).paragraphs : [];
      const composedInput = {
        ...input,
        paragraphs: [...prefix, ...input.paragraphs],
        maxHeight: top + 32 * scale,
        exclusion: { shape: "rect", side: "left", width: 20 * scale, top: edge, height: scale } as const,
      };
      const frame = operation.composeText(composedInput);
      const line = frame.measurement.lines[prefix.length];
      assert.equal(line?.fragments[0]?.x, 20 * scale);
      assert.ok(line && !line.inkBounds.empty);
      assert.equal(line.inkBounds.bottom, bottom);
      if (scale === 1 && top === 0) assert.equal(bottom, 16.05);
      const touching = operation.composeText({
        ...composedInput,
        exclusion: { ...composedInput.exclusion, top: bottom },
      });
      assert.equal(touching.measurement.lines[prefix.length]?.fragments[0]?.x, 0);
    } finally {
      operation.close();
    }
  }
});
