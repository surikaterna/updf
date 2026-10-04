import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { resolveWidths, type WidthTrack } from "@updf/layout";
import { bits, dyadic, spacing } from "../src/binary64.js";

const exact = (value: number) => dyadic(bits(value));
function rejects(input: unknown, path: string, code = "GEOMETRY") {
  assert.throws(
    () => resolveWidths(input, "/row"),
    (error) =>
      error instanceof DocumentError && error.diagnostics[0]?.path === path && error.diagnostics[0]?.code === code,
  );
}
test("fixed points remain bit-identical; gaps and bounded shares resolve without children", () => {
  assert.deepEqual(
    resolveWidths({ availableWidth: 100, tracks: [10, { weight: 1 }, { weight: 3 }], gap: 5 }).widths,
    [10, 20, 60],
  );
  assert.deepEqual(resolveWidths({ availableWidth: 100, tracks: [0.1, 0.2] }).widths, [0.1, 0.2]);
  const saturated = resolveWidths({
    availableWidth: 100,
    tracks: [10, { weight: 1, max: 20 }, { weight: 2, max: 30 }],
    gap: 5,
  });
  assert.deepEqual(saturated.widths, [10, 20, 30]);
  assert.equal(saturated.occupiedWidth, 70);
  assert.equal(saturated.unusedWidth, 30);
});
test("mixed clamps redistribute through multiple breakpoints, not simultaneous invalid clamps", () => {
  assert.deepEqual(
    resolveWidths({
      availableWidth: 100,
      tracks: [
        { weight: 1, min: 60 },
        { weight: 9, max: 50 },
      ],
    }).widths,
    [60, 40],
  );
  assert.deepEqual(
    resolveWidths({ availableWidth: 100, tracks: [{ weight: 1, max: 10 }, { weight: 1, max: 20 }, { weight: 1 }] })
      .widths,
    [10, 20, 70],
  );
  assert.deepEqual(
    resolveWidths({
      availableWidth: 60,
      tracks: [
        { weight: 1, min: 30 },
        { weight: 100, min: 30 },
      ],
    }).widths,
    [30, 30],
  );
});
test("fractional residual belongs to input order with exact dyadic conservation", () => {
  const result = resolveWidths({ availableWidth: 1, tracks: [{ weight: 1 }, { weight: 1 }, { weight: 1 }] });
  assert.ok((result.widths[0] ?? 0) > (result.widths[1] ?? 0));
  assert.equal(
    result.widths.reduce((sum, width) => sum + exact(width), 0n),
    exact(1),
  );
  assert.equal(result.unusedWidth, 0);
});
test("overflowing weight sums and underflowing ratios retain exact proportional shares", () => {
  for (const weight of [Number.MAX_VALUE, Number.MIN_VALUE]) {
    assert.deepEqual(resolveWidths({ availableWidth: 100, tracks: [{ weight }, { weight }] }).widths, [50, 50]);
  }
  const extremes = resolveWidths({
    availableWidth: Number.MAX_VALUE,
    tracks: [{ weight: Number.MIN_VALUE }, { weight: Number.MAX_VALUE }],
  });
  assert.equal(extremes.widths[0], Number.MIN_VALUE);
  assert.ok((extremes.widths[1] ?? Infinity) < Number.MAX_VALUE);
  assert.ok(extremes.unusedWidth > 0);
  assert.deepEqual(
    resolveWidths({ availableWidth: Number.MIN_VALUE * 2, tracks: [{ weight: 1 }, { weight: 1 }] }).widths,
    [Number.MIN_VALUE, Number.MIN_VALUE],
  );
});
test("infeasible exact sums reject even when native addition hides the excess", () => {
  rejects({ availableWidth: 1, tracks: [1, Number.MIN_VALUE] }, "/row/tracks");
  rejects(
    {
      availableWidth: 1,
      tracks: [
        { weight: 1, min: 0.6 },
        { weight: 1, min: 0.6 },
      ],
    },
    "/row/tracks",
  );
  rejects({ availableWidth: Number.MAX_VALUE, tracks: [Number.MAX_VALUE, Number.MAX_VALUE] }, "/row/tracks");
  rejects({ availableWidth: 1, gap: 1, tracks: [1, 1] }, "/row/tracks");
});
test("runtime diagnostics reject unknown, undefined, nonpositive and non-data inputs", () => {
  rejects({ availableWidth: 1, tracks: [0] }, "/row/tracks/0");
  rejects({ availableWidth: 1, tracks: [{ weight: 0 }] }, "/row/tracks/0/weight");
  rejects({ availableWidth: 1, tracks: [{ weight: 1, min: 0 }] }, "/row/tracks/0/min");
  rejects({ availableWidth: 1, tracks: [{ weight: 1, max: undefined }] }, "/row/tracks/0/max");
  rejects({ availableWidth: 1, tracks: [{ weight: 1, min: 2, max: 1 }] }, "/row/tracks/0/max");
  rejects({ availableWidth: 1, tracks: [{ weight: Infinity }] }, "/row/tracks/0/weight");
  rejects({ availableWidth: 1, tracks: [{ weight: 1, "a/b": 1 }] }, "/row/tracks/0/a~1b", "KEY");
  rejects({ availableWidth: 1, tracks: [1], gap: undefined }, "/row/gap");
  rejects({ availableWidth: 1, tracks: [1], maxTracks: 0 }, "/row/tracks", "LIMIT");
  rejects({ availableWidth: 1, tracks: [1], maxTracks: 0.5 }, "/row/maxTracks", "LIMIT");
  rejects({ availableWidth: 1, tracks: [] }, "/row/tracks", "VALUE");
  rejects({ availableWidth: 1, tracks: new Array(1) }, "/row/tracks", "TYPE");
  rejects({ availableWidth: 1, tracks: [1], extra: true }, "/row/extra", "KEY");
});
test("count budget rejects before inspecting track entries, and inputs/results are immutable", () => {
  const entries = [1, 2];
  Object.defineProperty(entries, "0", {
    get: () => {
      throw new Error("must not scan");
    },
  });
  rejects({ availableWidth: 10, tracks: entries, maxTracks: 1 }, "/row/tracks", "LIMIT");
  const weighted = { weight: 1 };
  const input = { availableWidth: 10, tracks: [weighted] };
  const before = structuredClone(input);
  const result = resolveWidths(input);
  assert.deepEqual(input, before);
  weighted.weight = 10;
  input.tracks.push({ weight: 3 });
  assert.deepEqual(result.widths, [10]);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.widths));
});
function random(seed: number) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}
test("seeded mixed constraints conserve exact budget and obey bounds across binary64 scales", () => {
  const next = random(45);
  for (let run = 0; run < 500; run++) {
    const scale = 2 ** (Math.floor(next() * 1900) - 950);
    const tracks: WidthTrack[] = Array.from({ length: 2 + Math.floor(next() * 8) }, () => {
      const min = scale * (1 + Math.floor(next() * 4));
      return next() < 0.2 ? min : { weight: 2 ** (Math.floor(next() * 2000) - 1000), min, max: min + scale * 20 };
    });
    const availableWidth = scale * 100;
    const result = resolveWidths({ availableWidth, tracks, gap: scale });
    assert.deepEqual(result, resolveWidths({ availableWidth, tracks, gap: scale }));
    const sum = result.widths.reduce((total, width) => total + exact(width), exact(scale) * BigInt(tracks.length - 1));
    assert.ok(sum <= exact(availableWidth));
    assert.ok(exact(result.occupiedWidth) >= sum && result.occupiedWidth <= availableWidth);
    tracks.forEach((track, i) => {
      const width = result.widths[i] ?? 0;
      assert.ok(Number.isFinite(width) && width > 0);
      if (typeof track === "number") assert.equal(width, track);
      else assert.ok(width >= (track.min ?? 0) && width <= (track.max ?? availableWidth));
    });
  }
});
test("unclamped proportional fairness differs only by bounded residual ULPs", () => {
  for (let count = 2; count <= 20; count++) {
    const weights = Array.from({ length: count }, (_, i) => i + 1);
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    const result = resolveWidths({ availableWidth: 101, tracks: weights.map((weight) => ({ weight })) });
    result.widths.forEach((width, i) => {
      const numerator = exact(101) * BigInt(weights[i] ?? 1);
      const difference = exact(width) * BigInt(total) - numerator;
      const absolute = difference < 0n ? -difference : difference;
      const bound = result.widths.reduce((sum, item) => sum + spacing(bits(item)), 0n) * BigInt(total);
      assert.ok(absolute <= bound);
    });
  }
});
