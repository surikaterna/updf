import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createOwnedResource, ownedResourceBytes } from "@updf/core/resources";
import { images } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { createImageCache } from "@updf/images/cache";
import { prepareDocument, layoutPrepared } from "@updf/layout/internal-preparation";
import { textFlow } from "@updf/text-flow";
import { pngAlphaShapes } from "@updf/text-flow/png-alpha";
import { Source } from "@updf/text-flow/sources";
import { preparePng } from "@updf/png";
import { transport } from "../../images/test/url-helpers.js";
import { alphaPng } from "./png-shape-fixture.js";
import { maskTree, maskBlock, document } from "./png-alpha-fixture.js";
import { geometryBytes, readAlphaGeometry } from "../dist/cjs/png-alpha-geometry.js";

const bytes = alphaPng(2, 2, [255, 0, 0, 255]);
test("cross-render image cache skips loading/PNG decoding but performs fresh shape inspection with fresh geometry handles", async () => {
  const { loader, calls } = transport(bytes);
  const cache = createImageCache({ maxEntries: 2, maxBytes: 100_000, maxConsumers: 4 });
  const extensions = [
    textFlow({ handlers: [pngAlphaShapes()] }),
    images({ loader, formatHandlers: [pngImages()], cache }),
  ];
  const Native = globalThis.DecompressionStream;
  let inflations = 0;
  globalThis.DecompressionStream = class extends Native {
    constructor(...args: ConstructorParameters<typeof Native>) {
      super(...args);
      inflations++;
    }
  };
  try {
    const a = layoutPrepared(await prepareDocument(maskTree(), { extensions }));
    const before = inflations;
    const b = layoutPrepared(await prepareDocument(maskTree(), { extensions }));
    assert.equal(calls.fetch, 1);
    assert.equal(inflations - before, 1);
    assert.equal(a.options.resources.Prepared0, b.options.resources.Prepared0);
    assert.notEqual(a.options.resources.Prepared1, b.options.resources.Prepared1);
    assert.equal(
      ownedResourceBytes(a.options.resources.Prepared0!),
      ownedResourceBytes(b.options.resources.Prepared0!),
    );
  } finally {
    globalThis.DecompressionStream = Native;
    cache.dispose();
  }
});
test("unused mask and derived geometry are both charged at the exact retained-byte boundary, including empty header cost", async () => {
  const original = await preparePng(bytes);
  const retained = ownedResourceBytes(original);
  const { loader } = transport(bytes);
  const cache = createImageCache({ maxEntries: 2, maxBytes: 100_000, maxConsumers: 4 });
  const extensions = [
    textFlow({ handlers: [pngAlphaShapes()] }),
    images({ loader, formatHandlers: [pngImages()], cache }),
  ];
  try {
    layoutPrepared(await prepareDocument(maskTree(), { extensions }));
    for (const [threshold, geometry] of [
      [0, 180],
      [1, 42],
    ]) {
      const tree = maskTree(Source.url("mask.png"), undefined, threshold);
      await assert.rejects(
        prepareDocument(tree, { extensions, limits: { resourceBytes: retained + geometry! - 1 } }),
        (e: unknown) => e instanceof DocumentError && e.diagnostics[0]!.code === "LIMIT",
      );
      const output = layoutPrepared(
        await prepareDocument(tree, { extensions, limits: { resourceBytes: retained + geometry! } }),
      );
      assert.equal(ownedResourceBytes(output.options.resources.Prepared1!), geometry);
    }
  } finally {
    cache.dispose();
  }
});
test("private geometry owner rejects copied/foreign core handles before reading metadata", () => {
  const policy = Object.freeze({ maxPixels: 4, maxCommands: 10 });
  for (const resource of [
    createOwnedResource({ kind: "contours", commands: [] }),
    {
      get metadata() {
        return assert.fail("metadata must not be read");
      },
    },
  ])
    assert.throws(() => readAlphaGeometry(resource as never, policy, "/shape"), DocumentError);
  assert.equal(geometryBytes({ kind: "empty", width: 1, height: 1, shapeImageThreshold: 1 }), 42);
});
test("two different complex thresholds exceed default cumulative commands, while an exact repeated threshold is extracted once", async () => {
  const pixels = Array.from({ length: 32 * 32 }, (_, i) => ((Math.floor(i / 32) + (i % 32)) % 2 ? 255 : 0));
  const { loader } = transport(alphaPng(32, 32, pixels));
  const extensions = [textFlow({ handlers: [pngAlphaShapes()] }), images({ loader, formatHandlers: [pngImages()] })];
  await assert.rejects(prepareDocument(document([maskBlock(0.15), maskBlock(0.2)]), { extensions }), /command/iu);
  const output = layoutPrepared(await prepareDocument(document([maskBlock(0.15), maskBlock(0.15)]), { extensions }));
  assert.equal(Object.keys(output.options.resources).length, 2);
});
