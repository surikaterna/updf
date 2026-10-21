import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { sum } from "@updf/core/internal";
import { paragraph as authored } from "@updf/layout";
import { createLayoutOperation } from "../../../tests/fixtures/text-options.js";
import { prepareLeaf } from "../dist/cjs/blocks.js";
import { OutputBudget } from "../dist/cjs/budget.js";
import { authorParagraph, normalizeBlocks } from "../dist/cjs/content-normalize.js";
import { measureParagraph } from "../dist/cjs/content-paragraph.js";
import { contentProducer } from "../dist/cjs/content-producer.js";
import type { ExtensionLifetime } from "../dist/cjs/extension-producer.js";
import { paintPrepared } from "./prepared-paint.js";
import { leafCache } from "../dist/cjs/leaf-cache.js";
import { closeParagraphFragments, paragraphFragments } from "../dist/cjs/paragraph-fragments.js";
import { paragraphProducer } from "../dist/cjs/paragraph-producer.js";
import type { RegionFragmentRequest } from "../dist/cjs/protocol.js";
import { paragraph } from "./fixtures.js";

const request: RegionFragmentRequest = {
  offset: 0,
  width: 80,
  usedHeight: 0,
  freshHeight: 20,
  availableHeight: 20,
  atFreshRegion: true,
};
function fixture(heights: readonly number[], keep = false, metadataHeight = sum(heights)) {
  const operation = createLayoutOperation({});
  const lifetime: ExtensionLifetime = { active: true };
  const fragments = paragraphFragments(lifetime);
  const definition = paragraph("A\nB\nC");
  const measured = operation.measureText({ width: 80, paragraphs: [definition] }, "/raw");
  assert.equal(measured.consumedHeight, sum(measured.lines.map((line) => line.height)));
  const lines = heights.map((height, index) => ({
    ...measured.lines[index % 3]!,
    height,
    ...(height === 0 ? { fragments: [], inkBounds: { empty: true as const } } : {}),
  }));
  const raw = paragraphProducer(
    { type: "paragraph", paragraph: definition, keepTogether: keep },
    { ...measured, lines, consumedHeight: metadataHeight, lineCount: lines.length },
    80,
    "/raw",
    fragments,
  );
  const rich = contentProducer(
    {
      lines: lines.map((line) => ({ ...line, fragments: [] })),
      height: metadataHeight,
      backgroundCount: () => 0,
      emissionCounts: () => ({ nodes: 0, text: 0, commands: 0, work: 0 }),
      paintLine: () => [],
    },
    80,
    keep,
    "/rich",
    fragments,
  );
  return {
    raw,
    rich,
    fragments,
    operation,
    close() {
      closeParagraphFragments(lifetime);
      operation.close();
    },
  };
}
test("both paragraph paths use the same kernel endpoint/height on fits, overflow, occupancy and fresh retry", () => {
  for (const heights of [
    [10, 10, 10],
    [0.1, 0.2, 1],
    [0, 0, 10],
  ]) {
    const f = fixture(heights);
    try {
      const source = f.fragments.operation.prepare({
        id: "oracle",
        path: "/oracle",
        descriptor: { measured: { lines: heights.map((height) => ({ height })), height: sum(heights) }, keep: false },
        extent: heights.length,
        mode: "splittable",
        width: { mode: "fixed", value: 80 },
      });
      for (const [height, usedHeight] of [
        [20, 0],
        [19.99, 0],
        [20, 10],
        [30, 0],
        [0.3, 0],
      ]) {
        const expected = f.fragments.operation.select(source, {
          offset: 0,
          width: 80,
          height: height!,
          usedHeight: usedHeight!,
        });
        [f.raw, f.rich].forEach((producer) => {
          const actual = producer.fragment({ ...request, freshHeight: height!, usedHeight: usedHeight! });
          assert.equal(actual?.nextOffset, expected?.end);
          assert.equal(actual?.height, expected?.height);
          if (actual) assert.deepEqual(actual.lines, { start: 0, end: expected!.end });
        });
      }
    } finally {
      f.close();
    }
  }
});
test("kept paragraphs select one unit but emit/reserve all lines, or none", () => {
  const f = fixture([10, 10, 10], true);
  try {
    for (const producer of [f.raw, f.rich]) {
      assert.equal(producer.fragment(request), undefined);
      const reserved: number[] = [];
      const selected = producer.fragment({
        ...request,
        freshHeight: 30,
        reserve: {
          apply: (_budget, _state, height) => {
            reserved.push(height);
            return height;
          },
        },
      })!;
      assert.equal(selected.nextOffset, 1);
      assert.equal(selected.height, 30);
      assert.deepEqual(selected.lines, { start: 0, end: 3 });
      assert.deepEqual(reserved, [10, 20, 30]);
      assert.equal(producer.fragment({ ...request, offset: 1 }), undefined);
    }
    assert.equal(f.fragments.operation.counts().providerUnits, 4);
  } finally {
    f.close();
  }
});
test("empty split/kept sources progress once at zero height independent of metadata, without paint or ghosts", () => {
  for (const keep of [false, true]) {
    const f = fixture([], keep, 99);
    try {
      for (const producer of [f.raw, f.rich]) {
        assert.equal(producer.extent, 1);
        const selected = producer.fragment({ ...request, freshHeight: 0 })!;
        assert.equal(selected.nextOffset, 1);
        assert.equal(selected.height, 0);
        assert.deepEqual(paintPrepared(selected, new OutputBudget(f.operation.policy)), []);
        assert.equal(producer.fragment({ ...request, offset: 1 }), undefined);
      }
    } finally {
      f.close();
    }
  }
});
test("zero-height nonempty groups progress without a fabricated positive interval certificate", () => {
  const f = fixture([0, 0, 10]);
  try {
    const selected = f.rich.fragment({ ...request, freshHeight: 0 })!;
    assert.equal(selected.nextOffset, 2);
    assert.equal(selected.height, 0);
    assert.deepEqual(
      selected.geometry.parts.map((part) => part.height),
      [0, 0],
    );
    assert.deepEqual(
      selected.geometry.parts.map((part) => part.certificate),
      [undefined, undefined],
    );
    paintPrepared(selected, new OutputBudget(f.operation.policy));
    const whole = f.rich.fragment(request)!;
    paintPrepared(whole, new OutputBudget(f.operation.policy));
  } finally {
    f.close();
  }
});
test("split retries retain source line indices, and actual empty native measurement has zero total height", () => {
  const f = fixture([10, 10, 10]);
  try {
    const empty = f.operation.measureText({ width: 80, paragraphs: [] }, "/empty");
    assert.equal(empty.lines.length, 0);
    assert.equal(empty.consumedHeight, 0);
    for (const producer of [f.raw, f.rich]) {
      const first = producer.fragment({ ...request, usedHeight: 10 })!;
      assert.deepEqual(first.lines, { start: 0, end: 1 });
      const rest = producer.fragment({ ...request, offset: first.nextOffset })!;
      assert.deepEqual(rest.lines, { start: 1, end: 3 });
      assert.equal(rest.nextOffset, 3);
      assert.equal(rest.height, 20);
    }
  } finally {
    f.close();
  }
});
test("exact successor width rejects before provider line work on each path and poisons the actual binding", () => {
  for (const arm of ["raw", "rich"] as const) {
    const f = fixture([10]);
    try {
      assert.throws(() => f[arm].fragment({ ...request, width: 80 + 2 ** -46 }), DocumentError);
      assert.equal(f.fragments.operation.counts().measurements, 0);
      assert.equal(f.fragments.operation.counts().providerUnits, 0);
      assert.throws(() => f[arm].fragment(request), /closed/);
    } finally {
      f.close();
    }
  }
});
test("raw and rich retries share finite default attempts; independent lifetimes and explicit closure stay isolated", () => {
  const f = fixture([10]);
  const other = fixture([10]);
  try {
    for (let index = 0; index < 10_000; index++)
      assert.equal((index % 2 ? f.raw : f.rich).fragment({ ...request, freshHeight: 0 }), undefined);
    assert.equal(f.fragments.operation.counts().attempts, 10_000);
    assert.equal(f.fragments.operation.counts().providerUnits, 10_000);
    assert.equal(f.fragments.operation.counts().outputFragments, 0);
    assert.throws(
      () => f.raw.fragment(request),
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
    );
    assert.equal(other.raw.fragment(request)!.nextOffset, 1);
    f.close();
    assert.throws(() => f.rich.fragment(request), /closed/);
  } finally {
    f.close();
    other.close();
  }
});
test("real prepareLeaf raw and authored branches retain one selection owner with unchanged measurements", () => {
  const operation = createLayoutOperation({});
  const lifetime: ExtensionLifetime = { active: true };
  try {
    const raw = { type: "paragraph", paragraph: paragraph("A\nB") };
    assert.equal(authorParagraph(raw as Parameters<typeof authorParagraph>[0]), undefined);
    const normalized = normalizeBlocks(
      authored({ children: "A\nB", whiteSpace: "preserve", style: { lineHeight: 1 } }),
      operation,
      "/rich",
    )[0]!;
    const first = prepareLeaf(raw, 80, "/raw", operation, undefined, lifetime);
    const owner = lifetime.paragraphFragments;
    const second = prepareLeaf(normalized, 80, "/rich", operation, undefined, lifetime);
    assert.equal(lifetime.paragraphFragments, owner);
    const author = authorParagraph(normalized)!;
    assert.equal(
      measureParagraph(author, 80, operation, undefined, "/rich"),
      measureParagraph(author, 80, operation, undefined, "/rich"),
    );
    assert.notEqual(
      measureParagraph(author, 80 + 2 ** -46, operation, undefined, "/rich"),
      measureParagraph(author, 80, operation, undefined, "/rich"),
    );
    first.fragment(request);
    second.fragment(request);
    assert.equal(owner!.operation.counts().sourceReads, 2);
    assert.equal(owner!.operation.counts().attempts, 2);
  } finally {
    closeParagraphFragments(lifetime);
    operation.close();
  }
});
test("accepted lines alone reserve ancestors and output; rejected lookahead still charges shared work", () => {
  const f = fixture([10, 10, 10]);
  try {
    for (const producer of [f.raw, f.rich]) {
      const reserved: number[] = [];
      const budget = new OutputBudget(f.operation.policy);
      const initialWork = f.fragments.operation.counts().providerUnits;
      const selected = producer.fragment({
        ...request,
        freshHeight: 10,
        budget,
        reserve: {
          apply: (_budget, _state, height) => {
            reserved.push(height);
            return height;
          },
        },
      })!;
      assert.deepEqual(reserved, [10]);
      assert.equal(selected.nextOffset, 1);
      assert.equal(f.fragments.operation.counts().providerUnits, initialWork + 2);
      const before = budget.totals();
      assert.equal(
        producer.fragment({
          ...request,
          freshHeight: 0,
          budget,
          reserve: { apply: () => assert.fail("rejected line reserved") },
        }),
        undefined,
      );
      assert.deepEqual(budget.totals(), before);
    }
    assert.equal(f.fragments.operation.counts().providerUnits, 6);
    assert.equal(f.fragments.operation.counts().outputFragments, 2);
  } finally {
    f.close();
  }
});
test("raw measurement cache retains TextMeasurement identity and exact authored width keys", () => {
  const operation = createLayoutOperation({});
  const lifetime: ExtensionLifetime = { active: true };
  const cache = leafCache();
  const raw = { type: "paragraph", paragraph: paragraph("A B C") };
  let measurements = 0;
  const host = {
    ...operation,
    measureText(...args: Parameters<typeof operation.measureText>) {
      measurements++;
      return operation.measureText(...args);
    },
  };
  try {
    prepareLeaf(raw, 80, "/raw", host, undefined, lifetime, cache);
    const measured = cache.paragraphs.get(raw)!.get(80)!;
    prepareLeaf(raw, 80, "/raw", host, undefined, lifetime, cache);
    assert.equal(cache.paragraphs.get(raw)!.get(80), measured);
    assert.equal(measurements, 1);
    prepareLeaf(raw, 80 + 2 ** -46, "/raw", host, undefined, lifetime, cache);
    assert.equal(measurements, 2);
    assert.notEqual(cache.paragraphs.get(raw)!.get(80 + 2 ** -46), measured);
    assert.equal(measured.consumedHeight, sum(measured.lines.map((line) => line.height)));
    assert.equal(lifetime.paragraphFragments!.operation.counts().sourceReads, 3);
  } finally {
    closeParagraphFragments(lifetime);
    operation.close();
  }
});
