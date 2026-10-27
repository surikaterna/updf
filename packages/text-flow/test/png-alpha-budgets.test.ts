import assert from "node:assert/strict";
import test from "node:test";
import { images } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { prepareDocument, layoutPrepared } from "@updf/layout/internal-preparation";
import { textFlow } from "@updf/text-flow";
import { pngAlphaShapes } from "@updf/text-flow/png-alpha";
import { transport } from "../../images/test/url-helpers.js";
import { alphaPng } from "./png-shape-fixture.js";
import { maskTree, maskBlock, document } from "./png-alpha-fixture.js";

const bytes = alphaPng(2, 2, [255, 0, 0, 255]);
const repeated = (thresholds: readonly number[]) => document(thresholds.map((n) => maskBlock(n)));
function setup(options = {}) {
  const { loader, calls } = transport(bytes);
  return {
    calls,
    extensions: [textFlow({ handlers: [pngAlphaShapes(options)] }), images({ loader, formatHandlers: [pngImages()] })],
  };
}
test("per-operation inspection and command budgets cache exact resource+threshold, including distinct negative zero", async () => {
  const exact = setup({ maxPixels: 4, maxCommands: 10 });
  const output = layoutPrepared(await prepareDocument(repeated([0.15, 0.15]), { extensions: exact.extensions }));
  assert.equal(Object.keys(output.options.resources).length, 2);
  assert.equal(exact.calls.fetch, 1);
  for (const thresholds of [
    [0, 0.1],
    [0, -0],
  ]) {
    const f = setup({ maxPixels: 4 });
    await assert.rejects(
      prepareDocument(repeated(thresholds), { extensions: f.extensions }),
      /Cumulative PNG shape budget/u,
    );
    assert.equal(f.calls.fetch, 1);
  }
  await assert.rejects(
    prepareDocument(repeated([0, 0.1]), { extensions: setup({ maxCommands: 15 }).extensions }),
    /command/iu,
  );
  await assert.rejects(prepareDocument(maskTree(), { extensions: setup({ maxPixels: 3 }).extensions }), /budget/u);
  await assert.rejects(prepareDocument(maskTree(), { extensions: setup({ maxCommands: 9 }).extensions }), /command/iu);
});
test("independent concurrent image/text-flow configurations keep limits immutable and session state separate", async () => {
  const low = setup({ maxPixels: 3 }),
    high = setup({ maxPixels: 4, maxCommands: 10 });
  const results = await Promise.allSettled([
    prepareDocument(maskTree(), { extensions: low.extensions }),
    prepareDocument(maskTree(), { extensions: high.extensions }),
  ]);
  assert.equal(results[0]!.status, "rejected");
  assert.equal(results[1]!.status, "fulfilled");
  if (results[1]!.status === "fulfilled") layoutPrepared(results[1]!.value);
  layoutPrepared(await prepareDocument(maskTree(), { extensions: high.extensions }));
  assert.equal(low.calls.fetch, 1);
  assert.equal(high.calls.fetch, 2);
});
test("constructor options and threshold are exact own data; duplicates reject before I/O", async () => {
  let calls = 0;
  for (const input of [
    undefined,
    null,
    { maxPixels: 0 },
    { maxPixels: 16_000_001 },
    { maxCommands: 4097 },
    { maxCommands: undefined },
    { maxPixels: 1.5 },
    { other: 1 },
    { [Symbol()]: 1 },
    Object.defineProperty({}, "maxPixels", {
      enumerable: true,
      get: () => {
        calls++;
        return 1;
      },
    }),
  ])
    assert.throws(() => pngAlphaShapes(input as never));
  assert.equal(calls, 0);
  assert.throws(() => textFlow({ handlers: [pngAlphaShapes(), pngAlphaShapes({ maxPixels: 1 })] }), /Duplicate/u);
  for (const n of [undefined, null, NaN, Infinity, -0.1, 1.1]) {
    const changed = document([maskBlock(n)]);
    await assert.rejects(prepareDocument(changed, { extensions: setup().extensions }), /threshold/iu);
  }
});
