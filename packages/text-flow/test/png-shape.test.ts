import assert from "node:assert/strict";
import { test } from "node:test";
import { preparePng } from "@updf/png";
import { preparePngShape } from "@updf/text-flow/png-shape";
import { pixelCellCommands } from "../src/png-shape-cells.js";
import { prepareCommands } from "../src/path-band.js";
import { bits, successor, value } from "@updf/layout-boxes/numeric";
import { fixture, rejection } from "../../png/test/helpers.js";
import { alphaPng, rectangles } from "./png-shape-fixture.js";

test("all 512 3x3 masks exactly preserve cells, holes and disconnected regions; direct native band projection", async () => {
  for (let mask = 0; mask < 512; mask++) {
    const alpha = Array.from({ length: 9 }, (_, i) => (mask & (1 << i) ? 255 : 0));
    const shape = await preparePngShape(await preparePng(alphaPng(3, 3, alpha)));
    const boxes = rectangles(shape);
    assert.ok(Object.isFrozen(shape));
    if (shape.kind === "contours") {
      assert.ok(Object.isFrozen(shape.commands));
      assert.ok(shape.commands.every(Object.isFrozen));
      const band = prepareCommands(shape.commands, 3, 3, "left", () => {}, "/shape");
      for (let y = 0; y < 3; y++) {
        const expected = Math.max(0, ...alpha.slice(y * 3, y * 3 + 3).map((a, x) => (a ? x + 1 : 0)));
        assert.equal(band.depth(y + 0.25, y + 0.75), expected);
      }
    }
    for (let i = 0; i < 9; i++) {
      const x = (i % 3) + 0.5,
        y = Math.floor(i / 3) + 0.5;
      assert.equal(
        boxes.filter((b) => b.left < x && x < b.right && b.top < y && y < b.bottom).length,
        alpha[i] ? 1 : 0,
      );
    }
  }
});

test("every alpha byte compares at and adjacent to alpha/255 using binary64 division", async () => {
  const alpha = Array.from({ length: 256 }, (_, i) => i);
  const resource = await preparePng(alphaPng(256, 1, alpha));
  for (let a = 0; a <= 255; a++) {
    const exact = a / 255;
    const thresholds = [exact, value(successor(bits(exact))!), exact === 0 ? 0 : value(bits(exact) - 1n)].filter(
      (t) => t >= 0 && t <= 1,
    );
    for (const threshold of thresholds) {
      const boxes = rectangles(await preparePngShape(resource, { shapeImageThreshold: threshold }));
      for (let x = 0; x < 256; x++)
        assert.equal(
          boxes.some((b) => b.left <= x && x < b.right),
          x / 255 > threshold,
        );
    }
  }
});

test("identical consecutive runs merge; gaps finalize; opaque and fully transparent results honor exact caps", async () => {
  const resource = await preparePng(alphaPng(3, 4, [255, 255, 0, 255, 255, 0, 0, 0, 0, 255, 255, 0]));
  const shape = await preparePngShape(resource, { maxCommands: 10 });
  assert.deepEqual(rectangles(shape), [
    { left: 0, right: 2, top: 0, bottom: 2 },
    { left: 0, right: 2, top: 3, bottom: 4 },
  ]);
  await rejection(() => preparePngShape(resource, { maxCommands: 9 }), "LIMIT");
  const opaque = await preparePng(fixture(0, [1, 2, 3, 4]));
  assert.equal((await preparePngShape(opaque, { maxCommands: 5 })).kind, "contours");
  await rejection(() => preparePngShape(opaque, { maxCommands: 4 }), "LIMIT");
  assert.equal((await preparePngShape(opaque, { maxCommands: 1, shapeImageThreshold: 1 })).kind, "empty");
  const empty = await preparePng(alphaPng(1, 1, [0]));
  assert.equal((await preparePngShape(empty, { maxCommands: 1 })).kind, "empty");
  assert.ok(Object.is((await preparePngShape(empty, { shapeImageThreshold: -0 })).shapeImageThreshold, -0));
});

test("invalid options, descriptors and lower-only budgets fail without inflation", async () => {
  const resource = await preparePng(alphaPng(2, 2, [1, 2, 3, 4]));
  for (const options of [
    undefined,
    null,
    [],
    {
      get maxCommands(): never {
        throw new Error("getter ran");
      },
    },
    { [Symbol()]: 1 },
    { unknown: 1 },
    { maxCommands: undefined },
    { signal: null },
    { signal: undefined },
  ])
    await rejection(() => preparePngShape(resource, options as never), "TYPE");
  for (const shapeImageThreshold of [NaN, Infinity, -Number.MIN_VALUE, 1 + Number.EPSILON, null])
    await rejection(() => preparePngShape(resource, { shapeImageThreshold: shapeImageThreshold as number }), "VALUE");
  for (const maxCommands of [0, -1, 1.5, 4097, null])
    await rejection(() => preparePngShape(resource, { maxCommands: maxCommands as number }), "VALUE");
  for (const maxPixels of [0, NaN, 16_000_001, null])
    await rejection(() => preparePngShape(resource, { maxPixels: maxPixels as number }), "VALUE");
  const original = globalThis.DecompressionStream;
  globalThis.DecompressionStream = class {
    constructor() {
      throw new Error("inflation attempted");
    }
  } as never;
  try {
    await rejection(() => preparePngShape(resource, { maxPixels: 3 }), "LIMIT");
  } finally {
    globalThis.DecompressionStream = original;
  }
});

test("checkerboard command reservation fails before retaining a wide row of runs", () => {
  let reads = 0;
  const bytes = new Proxy(new Uint8Array(1), {
    get: (_target, key) => {
      if (typeof key === "string" && /^\d+$/u.test(key)) {
        reads++;
        return Number(key) % 2 ? 0 : 255;
      }
      return undefined;
    },
  });
  assert.throws(
    () =>
      pixelCellCommands(
        { kind: "alpha", width: 16_000_000, height: 1, bytes },
        { shapeImageThreshold: 0, maxCommands: 10, maxPixels: 16_000_000 },
      ),
    /command budget/u,
  );
  assert.ok(reads < 20, String(reads));
});

test("structural cancellation is checked between rows, including synchronous scan", () => {
  let reads = 0;
  const signal = {
    get aborted() {
      return ++reads > 2;
    },
    addEventListener() {},
    removeEventListener() {},
  };
  assert.throws(
    () =>
      pixelCellCommands(
        { kind: "alpha", width: 1, height: 4, bytes: new Uint8Array([255, 255, 255, 255]) },
        { signal, shapeImageThreshold: 0, maxCommands: 5, maxPixels: 4 },
      ),
    /aborted/u,
  );
  assert.equal(reads, 3);
});

test("random byte masks preserve exact occupancy and conservative cross-row bands", async () => {
  let state = 37;
  const sample = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state >>> 24;
  };
  for (let trial = 0; trial < 30; trial++) {
    const alpha = Array.from({ length: 63 }, sample),
      threshold = sample() / 255;
    const shape = await preparePngShape(await preparePng(alphaPng(9, 7, alpha)), { shapeImageThreshold: threshold });
    const boxes = rectangles(shape);
    for (let i = 0; i < alpha.length; i++) {
      const x = (i % 9) + 0.5,
        y = Math.floor(i / 9) + 0.5;
      assert.equal(
        boxes.filter((b) => b.left < x && x < b.right && b.top < y && y < b.bottom).length,
        alpha[i]! / 255 > threshold ? 1 : 0,
      );
    }
    if (shape.kind !== "contours") continue;
    const band = prepareCommands(shape.commands, 9, 7, "left", () => {}, "/shape");
    for (let y = 0; y < 6; y++) {
      const occupied = alpha.slice(y * 9, (y + 2) * 9).map((a, x) => (a / 255 > threshold ? (x % 9) + 1 : 0));
      assert.equal(band.depth(y + 0.5, y + 1.5), Math.max(0, ...occupied));
    }
  }
});

test("default 4096 cap admits 819 exact rectangles but rejects the 820th", async () => {
  for (const count of [819, 820]) {
    const alpha = Array.from({ length: count * 2 }, (_, i) => (i % 2 ? 0 : 255));
    const resource = await preparePng(alphaPng(alpha.length, 1, alpha));
    if (count === 820) {
      await rejection(() => preparePngShape(resource), "LIMIT");
      continue;
    }
    const shape = await preparePngShape(resource);
    assert.equal(shape.kind === "contours" && shape.commands.length, 4095);
  }
});
