import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { render } from "@updf/core";
import { createOwnedResource, ownedResourceBytes } from "@updf/core/resources";
import { preparePng, pngProvider, type PngResource } from "@updf/png";
import { readPngAlpha } from "@updf/png/alpha";
import { chunk, document, fixture, rejection } from "./helpers.js";

test("alpha plane is independently owned; inspection leaves resource, byte certificate and PDF unchanged", async () => {
  const resource = await preparePng(fixture());
  const options = { resources: { image: resource }, providers: [pngProvider()] };
  const pdf = render(document(), options),
    size = ownedResourceBytes(resource);
  const first = await readPngAlpha(resource);
  assert.ok(Object.isFrozen(first));
  assert.equal(first.kind, "alpha");
  if (first.kind !== "alpha") return;
  assert.deepEqual([...first.bytes], [255, 128, 0, 255]);
  first.bytes.fill(0);
  const second = await readPngAlpha(resource);
  assert.equal(second.kind, "alpha");
  if (second.kind === "alpha") assert.deepEqual([...second.bytes], [255, 128, 0, 255]);
  assert.equal(ownedResourceBytes(resource), size);
  assert.deepEqual(render(document(), options), pdf);
});

test("native gray alpha, indexed transparency, gray/RGB keys and opaque sources use prepared alpha", async () => {
  const cases: [Uint8Array, number[] | undefined][] = [
    [fixture(4, [1, 0, 2, 1, 3, 128, 4, 255]), [0, 1, 128, 255]],
    [
      fixture(
        3,
        [0, 1, 2, 1],
        [chunk("PLTE", Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9])), chunk("tRNS", Buffer.from([0, 128]))],
      ),
      [0, 128, 255, 128],
    ],
    [fixture(0, [1, 2, 1, 4], [chunk("tRNS", Buffer.from([0, 1]))]), [0, 255, 0, 255]],
    [
      fixture(2, [1, 2, 3, 4, 5, 6, 1, 2, 3, 7, 8, 9], [chunk("tRNS", Buffer.from([0, 1, 0, 2, 0, 3]))]),
      [0, 255, 0, 255],
    ],
    [fixture(0, [1, 2, 3, 4]), undefined],
    [fixture(2, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), undefined],
  ];
  for (const [source, expected] of cases) {
    const plane = await readPngAlpha(await preparePng(source));
    assert.equal(plane.width, 2);
    assert.equal(plane.height, 2);
    assert.equal(plane.kind, expected ? "alpha" : "opaque");
    if (plane.kind === "alpha") assert.deepEqual([...plane.bytes], expected);
  }
});

test("exact ownership precedes untrusted metadata access, including proxies and forged genuine core handles", async () => {
  const owned = await preparePng(fixture());
  const unreadable = {
    get metadata(): never {
      throw new Error("metadata was read");
    },
  };
  const forged = createOwnedResource({ kind: "png", width: 2, height: 2, alpha: true, components: 3 });
  for (const input of [unreadable, new Proxy(owned, {}), { ...owned }, forged, null, 1])
    await rejection(() => readPngAlpha(input as PngResource), "RESOURCE");
});

test("alpha option descriptors and lower-only pixel limits reject before inflation", async () => {
  const resource = await preparePng(fixture());
  const original = globalThis.DecompressionStream;
  globalThis.DecompressionStream = class {
    constructor() {
      throw new Error("inflation attempted");
    }
  } as never;
  try {
    for (const options of [
      undefined,
      null,
      [],
      { signal: undefined },
      { signal: null },
      { other: 1 },
      { [Symbol()]: 1 },
      {
        get maxPixels(): never {
          throw new Error("getter ran");
        },
      },
    ])
      await rejection(() => readPngAlpha(resource, options as never), "TYPE");
    for (const maxPixels of [0, -1, NaN, Infinity, 1.5, 16_000_001, null])
      await rejection(() => readPngAlpha(resource, { maxPixels: maxPixels as number }), "VALUE");
    await rejection(() => readPngAlpha(resource, { maxPixels: 3 }), "LIMIT");
    const controller = new AbortController();
    controller.abort();
    await rejection(() => readPngAlpha(resource, { signal: controller.signal }), "PNG_ABORT");
  } finally {
    globalThis.DecompressionStream = original;
  }
});

test("Node import/require facades share the same PNG owner", async () => {
  const require = createRequire(import.meta.url);
  const common = require("@updf/png/alpha") as typeof import("@updf/png/alpha");
  assert.equal(common.readPngAlpha, readPngAlpha);
  assert.equal((await common.readPngAlpha(await preparePng(fixture()))).kind, "alpha");
});

test("alpha output must have exact pixel count and native stream locks are cleaned on failure/abort", async () => {
  const resource = await preparePng(fixture());
  const original = globalThis.DecompressionStream;
  for (const length of [3, 5, -1]) {
    const counts = { cancel: 0, release: 0, abort: 0 };
    let sent = false;
    globalThis.DecompressionStream = class {
      readable = {
        getReader: () => ({
          read: () => {
            if (length < 0) return new Promise(() => {});
            if (sent) return Promise.resolve({ done: true });
            sent = true;
            return Promise.resolve({ done: false, value: new Uint8Array(length) });
          },
          cancel: async () => {
            counts.cancel++;
          },
          releaseLock: () => {
            counts.release++;
          },
        }),
      };
      writable = {
        getWriter: () => ({
          write: async () => {},
          close: async () => {},
          abort: async () => {
            counts.abort++;
          },
          releaseLock: () => {
            counts.release++;
          },
        }),
      };
    } as never;
    try {
      const controller = new AbortController();
      const pending = readPngAlpha(resource, { signal: controller.signal });
      if (length < 0) controller.abort();
      await rejection(() => pending, length < 0 ? "PNG_ABORT" : "PNG_DATA");
      assert.deepEqual(counts, { cancel: 1, release: 2, abort: 1 });
    } finally {
      globalThis.DecompressionStream = original;
    }
  }
});
