import assert from "node:assert/strict";
import test from "node:test";
import { deflateSync } from "node:zlib";
import type { NodeDefinition } from "@updf/core";
import { images } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import type { BlockStyle } from "@updf/layout";
import { layoutPrepared, prepareDocument } from "@updf/layout/internal-preparation";
import { chunk, container, header } from "../../png/test/helpers.js";
import { bridgeFixture } from "./bridge-fixture.js";
import { transport } from "./url-helpers.js";

const pixels = container(
  header(2, 4, 2),
  chunk("IDAT", deflateSync(Buffer.from([0, ...Array(12).fill(180), 0, ...Array(12).fill(90)]))),
  chunk("IEND"),
);

/** Independent test-only inspection; production references never traverse native output. */
function nativeImage(nodes: readonly NodeDefinition[], x = 0, y = 0): object[] {
  const results: object[] = [];
  for (const node of nodes) {
    if (node.type === "xObject")
      results.push({ x: x + (node.x ?? 0), y: y + (node.y ?? 0), width: node.width, height: node.height });
    if (node.type === "paintGroup") {
      const matrix = node.transform ?? [1, 0, 0, 1, 0, 0];
      assert.deepEqual(matrix.slice(0, 4), [1, 0, 0, 1]);
      results.push(...nativeImage(node.children, x + matrix[4]!, y + matrix[5]!));
    }
  }
  return results;
}

const border = (width: number) => ({ width, color: [0, 0, 0] as const });
const styles: BlockStyle[] = [
  { width: 40, height: 30 },
  {
    width: 40,
    height: 30,
    paddingTop: 1.25,
    paddingBottom: 2.75,
    paddingLeft: 3.125,
    paddingRight: 4.625,
    borderLeft: border(0.25),
    borderRight: border(0.5),
    borderTop: border(0.75),
    borderBottom: border(1.5),
  },
  { width: 40, height: 30, minWidth: 50, minHeight: 40, padding: 0.125 },
  { width: 80, height: 90, maxWidth: 60, maxHeight: 50, paddingLeft: 1.125, paddingTop: 2.375 },
  { width: 30, height: 70, minWidth: 20, maxWidth: 40, minHeight: 60, maxHeight: 80 },
];

test("Image reference equals independently inspected native placement for contain/fill and constrained asymmetric boxes", async () => {
  for (const fit of ["contain", "fill"])
    for (const style of styles) {
      const f = bridgeFixture();
      const { loader } = transport(pixels);
      const output = layoutPrepared(
        await prepareDocument(f.document({ src: "image.png", mask: "image.png", fit, style }), {
          extensions: [f.feature, images({ loader, formatHandlers: [pngImages()] })],
        }),
      );
      assert.deepEqual(nativeImage(output.document.pages[0]!.children), [f.references[0]]);
      assert.ok(Object.isFrozen(f.references[0]));
    }
});

test("repeated preparation preserves references while exact height and width changes select distinct placement reports", async () => {
  const reports: object[] = [];
  let afterClose!: () => unknown;
  const f = bridgeFixture(false, (sources, context) => {
    const source = sources[0]!;
    const first = context.prepare(source, 90);
    const again = context.prepare(source, 90);
    assert.deepEqual(context.reference(source, first), context.reference(source, again));
    reports.push(context.reference(source, first));
    assert.throws(() => context.reference({ ...source }, first));
    afterClose = () => context.reference(source, first);
  });
  for (const height of [30, 60, 30]) {
    const { loader } = transport(pixels);
    layoutPrepared(
      await prepareDocument(f.document({ src: "image.png", mask: "image.png", style: { width: 40, height } }), {
        extensions: [f.feature, images({ loader, formatHandlers: [pngImages()] })],
      }),
    );
    assert.throws(afterClose);
  }
  assert.deepEqual(reports[0], reports[2]);
  assert.notDeepEqual(reports[0], reports[1]);
});
