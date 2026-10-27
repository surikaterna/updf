import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import type { CompositionInput, EdgeProfileExclusion, TextExclusion } from "@updf/text/composition";
import { compositionOptions, createLayoutOperation } from "../../../tests/fixtures/text-flow/options.js";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";
import { silhouette } from "../../../tests/fixtures/text-flow/edge-profile.js";

const constant: EdgeProfileExclusion = {
  shape: "edge-profile",
  side: "left",
  points: [
    { x: 20, y: 0 },
    { x: 20, y: 32 },
  ],
};
function compose(text: string, exclusion: TextExclusion = constant, props: Partial<CompositionInput> = {}) {
  const operation = createLayoutOperation(compositionOptions());
  try {
    return operation.composeText({ ...rectangular(text, {}, 60), maxHeight: 1000, exclusion, ...props });
  } finally {
    operation.close();
  }
}
function code(input: unknown, expected: string) {
  const operation = createLayoutOperation(compositionOptions());
  try {
    assert.throws(
      () => operation.composeText(input as CompositionInput),
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === expected,
    );
  } finally {
    operation.close();
  }
}
test("constant profiles match rectangle geometry on both sides, including nonzero tops and collinear points", () => {
  for (const side of ["left", "right"] as const)
    for (const top of [0, 4, 16, 100]) {
      const profile = {
        ...constant,
        side,
        top,
        points: [
          { x: 20, y: 0 },
          { x: 20, y: 8 },
          { x: 20, y: 32 },
        ],
      };
      const rect = { shape: "rect", side, top, width: 20, height: 32 } as const;
      assert.deepEqual(compose("AB CD EF GH IJ KL", profile), compose("AB CD EF GH IJ KL", rect));
    }
});
test("whole-band internal peaks and caps reserve depth even with baseline outside; exact touches are disjoint", () => {
  for (const side of ["left", "right"] as const) {
    const profile = {
      ...constant,
      side,
      top: 14,
      points: [
        { x: 1, y: 0 },
        { x: 25, y: 1 },
        { x: 1, y: 2 },
      ],
    };
    const frame = compose("AB", profile),
      line = frame.measurement.lines[0]!;
    assert.ok(line.baseline < 14);
    assert.equal(line.fragments[0]!.x, side === "left" ? 25 : 0);
    if (!line.inkBounds.empty) assert.ok(side === "left" ? line.inkBounds.left >= 25 : line.inkBounds.right <= 35);
    assert.equal(compose("AB", { ...profile, top: 16 }).measurement.lines[0]!.fragments[0]!.x, 0);
    const bottom = compose("\nAB", {
      ...constant,
      side,
      points: [
        { x: 20, y: 0 },
        { x: 20, y: 16 },
      ],
    });
    assert.equal(bottom.measurement.lines[1]!.fragments[0]!.x, 0);
  }
});
test("blocked units retry unchanged source on the line-height grid and fit inside a widening slope", () => {
  for (const side of ["left", "right"] as const)
    for (const start of [59, 60]) {
      const frame = compose("AB CD", {
        ...constant,
        side,
        points: [
          { x: start, y: 0 },
          { x: 1, y: 96 },
        ],
      });
      const first = frame.measurement.lines[0]!;
      assert.ok(first.top > 0 && first.top < 96);
      assert.equal(first.top % 16, 0);
      assert.equal(first.fragments[0]!.source.start, 0);
      assert.equal(frame.height, first.top + frame.measurement.lineCount * 16);
    }
  // Space opens at y=17, but this contract considers only 0,16,32,... .
  const grid = compose("AB", {
    ...constant,
    points: [
      { x: 60, y: 0 },
      { x: 60, y: 17 },
    ],
  });
  assert.equal(grid.measurement.lines[0]!.top, 32);
  code(
    {
      ...rectangular("abcdefghijk", {}, 1),
      maxHeight: 100,
      exclusion: {
        ...constant,
        points: [
          { x: 1, y: 0 },
          { x: 1, y: 1 },
        ],
      },
    },
    "TOKEN_OVERFLOW",
  );
});
test("empty arrays and unused geometry do not force height; gaps count toward actual height and ceiling", () => {
  const profile = {
    ...constant,
    points: [
      { x: 60, y: 0 },
      { x: 60, y: 17 },
    ],
  };
  assert.equal(compose("", profile, { paragraphs: [], maxHeight: 0 }).height, 0);
  assert.equal(
    compose("AB", {
      ...constant,
      top: 100,
      points: [
        { x: 60, y: 0 },
        { x: 60, y: 1e12 },
      ],
    }).height,
    16,
  );
  assert.equal(compose("AB", profile).height, 48);
  code({ ...rectangular("AB", {}, 60), maxHeight: 47, exclusion: profile }, "VERTICAL_OVERFLOW");
});
test("exact profile domains reject rings, unknown fields, repeated/reversed heights and translated collapse", () => {
  const input = { ...rectangular("AB", {}, 60), maxHeight: 100 };
  const invalid = [
    [],
    [{ x: 1, y: 0 }],
    [
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: -1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: 2 },
      { x: 1, y: 0 },
    ],
  ];
  for (const points of invalid) code({ ...input, exclusion: { ...constant, points } }, "GEOMETRY");
});
test("depth and height domains are exact, with no epsilon rejection of tiny positive profiles", () => {
  const input = { ...rectangular("AB", {}, 60), maxHeight: 100 };
  for (const x of [0, -Number.MIN_VALUE, 60 + 1e-12, NaN, Infinity])
    code(
      {
        ...input,
        exclusion: {
          ...constant,
          points: [
            { x, y: 0 },
            { x: 1, y: 1 },
          ],
        },
      },
      "GEOMETRY",
    );
  for (const y of [NaN, Infinity])
    code(
      {
        ...input,
        exclusion: {
          ...constant,
          points: [
            { x: 1, y: 0 },
            { x: 1, y },
          ],
        },
      },
      "GEOMETRY",
    );
});
test("translation rejects nonfinite or collapsed heights and authored negative tops", () => {
  const input = { ...rectangular("AB", {}, 60), maxHeight: 100 };
  for (const top of [-Number.MIN_VALUE, NaN, Infinity, 1e300])
    code({ ...input, exclusion: { ...constant, top } }, "GEOMETRY");
  code(
    {
      ...input,
      exclusion: {
        ...constant,
        top: 1e308,
        points: [
          { x: 1, y: 0 },
          { x: 1, y: 1e308 },
        ],
      },
    },
    "GEOMETRY",
  );
});
test("profile and point keys are closed; polygon naming and invalid sides are rejected", () => {
  const input = { ...rectangular("AB", {}, 60), maxHeight: 100 };
  for (const extra of [{ ring: [] }, { width: 20 }, { holes: [] }])
    code({ ...input, exclusion: { ...constant, ...extra } }, "KEY");
  code({ ...input, exclusion: { ...constant, side: "middle" } }, "VALUE");
  code({ ...input, exclusion: { shape: "polygon", side: "left" } }, "VALUE");
  code(
    {
      ...input,
      exclusion: {
        ...constant,
        points: [
          { x: 1, y: 0, extra: 1 },
          { x: 1, y: 1 },
        ],
      },
    },
    "KEY",
  );
  assert.equal(
    compose("AB", {
      ...constant,
      points: [
        { x: Number.MIN_VALUE, y: 0 },
        { x: Number.MIN_VALUE, y: Number.MIN_VALUE },
      ],
    }).height,
    16,
  );
});
test("silhouettes retain native PDF ownership and lifecycle, with no measurement service needed at paint", () => {
  const options = compositionOptions(),
    operation = createLayoutOperation(options);
  const frame = operation.composeText(silhouette()),
    node = operation.composedText(frame);
  operation.close();
  const document = { version: 1, pages: [{ width: 100, height: 200, children: [node] }] } as const;
  const { text: _text, ...paintOnly } = options;
  assert.deepEqual(render(document, paintOnly), render(document, options));
  assert.throws(() => operation.composedText(frame), DocumentError);
});
