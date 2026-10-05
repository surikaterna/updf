import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { type DocumentDefinition, DocumentError } from "@updf/core";
import { createLayoutOperation, render } from "../../../tests/fixtures/text-options.js";
import {
  block,
  createExtensions,
  defineBlockAdapter,
  extension,
  layoutFlow,
} from "../../../tests/fixtures/transitional-layout.js";
import { paintSharedEdges } from "../dist/cjs/shared-edge-paint.js";
import { ownEdgeRegion, ownSharedEdgeGroup } from "../dist/cjs/shared-edge-regions.js";
import type { LocalEdgeClaim } from "@updf/layout";
import { flow } from "./fixtures.js";

const edge: LocalEdgeClaim = {
  axis: "horizontal",
  interval: [0, 80],
  coordinate: 10,
  ownerSide: "bottom",
  provenance: "grid",
  width: 2,
  color: [0, 0, 0],
  sourcePath: "/fixture",
};
function paint(claims: readonly LocalEdgeClaim[]) {
  const operation = createLayoutOperation({});
  const region = ownEdgeRegion({ width: 80, height: 20, nodes: [], claims }, operation, "/fixture");
  const group = ownSharedEdgeGroup({ width: 80, height: 20, regions: [{ region, x: 0, y: 0 }] }, operation, "/fixture");
  return paintSharedEdges(group, operation, "/fixture");
}
test("grid intervals split overlaps by width, retain gaps, and coalesce adjacent equal paint", () => {
  const nodes = paint([
    { ...edge, interval: [0, 30] },
    { ...edge, interval: [30, 60] },
    { ...edge, interval: [20, 40], width: 4, color: [1, 0, 0] },
    { ...edge, interval: [70, 80] },
  ]);
  assert.deepEqual(
    nodes.map((node) => (node.type === "rect" ? [node.x, node.y, node.width, node.height, node.paint?.fill] : [])),
    [
      [0, 9, 20, 2, [0, 0, 0]],
      [20, 8, 20, 4, [1, 0, 0]],
      [40, 9, 20, 2, [0, 0, 0]],
      [70, 9, 10, 2, [0, 0, 0]],
    ],
  );
  assert.equal(
    paint([
      { ...edge, interval: [0, 40] },
      { ...edge, interval: [40, 80] },
    ]).length,
    1,
  );
});
test("#42-B2 generic provenance and owner ranking does not depend on incoming report order", () => {
  const explicit = { ...edge, provenance: "explicit" as const, color: [1, 0, 0] as const };
  for (const axis of ["horizontal", "vertical"] as const) {
    const winner = {
      ...explicit,
      axis,
      interval: [0, 20] as const,
      ownerSide: axis === "horizontal" ? ("bottom" as const) : ("right" as const),
    };
    const opposing = {
      ...winner,
      ownerSide: axis === "horizontal" ? ("top" as const) : ("left" as const),
      color: [0, 0, 1] as const,
    };
    for (const claims of [
      [opposing, winner],
      [winner, opposing],
    ])
      assert.deepEqual(
        paint(claims).map((node) => (node.type === "rect" ? node.paint?.fill : undefined)),
        [[1, 0, 0]],
      );
    assert.deepEqual(
      paint([
        { ...winner, provenance: "grid", width: 8 },
        { ...opposing, width: 0 },
      ]),
      [],
    );
    assert.deepEqual(
      paint([{ ...winner, provenance: "grid", width: 8 }, opposing]).map((node) =>
        node.type === "rect" ? node.paint?.fill : undefined,
      ),
      [[0, 0, 1]],
    );
  }
});
test("outer centerlines intersect only their allocation and unrepresentable stroke thickness rejects", () => {
  const nodes = paint([
    { ...edge, coordinate: 0, ownerSide: "top" },
    { ...edge, coordinate: 20 },
  ]);
  assert.deepEqual(
    nodes.map((node) => (node.type === "rect" ? [node.y, node.height] : [])),
    [
      [0, 1],
      [19, 1],
    ],
  );
  assert.throws(() => paint([{ ...edge, width: Number.MIN_VALUE }]), DocumentError);
});
test("B1 logical overlap resolves inset only on unshared spans without epsilon or same-side touch", () => {
  const operation = createLayoutOperation({});
  const before = ownEdgeRegion(
    { width: 80, height: 10, nodes: [], claims: [{ ...edge, unsharedInset: 2, startInset: 2, endInset: 2 }] },
    operation,
    "/before",
  );
  const after = ownEdgeRegion(
    {
      width: 40,
      height: 10,
      nodes: [],
      claims: [{ ...edge, coordinate: 0, interval: [0, 40], ownerSide: "top", unsharedInset: 2 }],
    },
    operation,
    "/after",
  );
  const group = ownSharedEdgeGroup(
    {
      width: 80,
      height: 20,
      regions: [
        { region: before, x: 0, y: 0 },
        { region: after, x: 20, y: 10 },
      ],
    },
    operation,
    "/group",
  );
  assert.deepEqual(
    paintSharedEdges(group, operation, "/group").map((node) =>
      node.type === "rect" ? [node.x, node.y, node.width, node.height] : [],
    ),
    [
      [2, 7, 18, 2],
      [20, 9, 40, 2],
      [60, 7, 18, 2],
    ],
  );
  assert.deepEqual(before.claims[0]!.interval, [0, 80]);
  assert.equal(before.claims[0]!.coordinate, 10);
});
test("the interval sweep handles many overlapping starts and expired winners without quadratic rescans", () => {
  const claims = Array.from(
    { length: 4000 },
    (_, index): LocalEdgeClaim => ({
      ...edge,
      interval: [index / 100, 80],
      width: index % 2 ? 2 : 1,
    }),
  );
  const nodes = paint(claims);
  assert.equal(nodes.length, 2);
  assert.equal(nodes[1]?.type === "rect" ? nodes[1].width : 0, 79.99);
});
async function raster(document: DocumentDefinition): Promise<Buffer> {
  const directory = await mkdtemp(join(tmpdir(), "updf-shared-edge-"));
  try {
    const pdf = join(directory, "fixture.pdf"),
      image = join(directory, "image");
    await writeFile(pdf, render(document));
    execFileSync("pdftoppm", ["-r", "72", "-aa", "no", "-aaVector", "no", "-singlefile", pdf, image]);
    const ppm = await readFile(`${image}.ppm`);
    const header = /^P6\s+100 100\s+255\s/u.exec(ppm.subarray(0, 30).toString("ascii"));
    assert.ok(header);
    return ppm.subarray(header[0].length);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
function assertSingleStrip(rgb: Buffer): void {
  assert.equal(rgb.length, 100 * 100 * 3);
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      const expected = x >= 10 && x < 90 && y >= 19 && y < 21 ? 0 : 255;
      assert.deepEqual([...rgb.subarray((y * 100 + x) * 3, (y * 100 + x) * 3 + 3)], [expected, expected, expected]);
    }
  }
}
test("real grouped marker PDF paints one seam inside the ancestor allocation, outside child content clips", async () => {
  const adapter = defineBlockAdapter({
    name: "edges.paint-fixture",
    validate: (input) => input,
    measure(_props, context) {
      const before = context.edgeRegion({ width: 80, height: 10, nodes: [], claims: [edge] });
      const after = context.edgeRegion({
        width: 80,
        height: 10,
        nodes: [],
        claims: [{ ...edge, coordinate: 0, ownerSide: "top" }],
      });
      return {
        sharedEdges: true,
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 80, height: 20 },
        fragment: () => ({
          status: "placed",
          nextOffset: 1,
          height: 20,
          nodes: [
            { type: "paintGroup", clip: { x: 0, y: 0, width: 5, height: 5 }, children: [before] },
            { type: "paintGroup", transform: [1, 0, 0, 1, 0, 10], children: [after] },
          ],
        }),
      };
    },
  });
  const result = layoutFlow(
    flow([block({ style: { padding: 10, height: 40, overflow: "hidden" }, children: [extension(adapter, {})] })], {
      height: 100,
    }),
    {},
    createExtensions([adapter]),
  );
  assert.equal((JSON.stringify(result.document).match(/"type":"rect"/gu) ?? []).length, 1);
  assertSingleStrip(await raster(result.document));
  const missing: DocumentDefinition = { version: 1, pages: [{ width: 100, height: 100, children: [] }] };
  assert.throws(() => assertSingleStrip(Buffer.alloc(30000, 255)));
  assert.throws(() => assertSingleStrip(Buffer.alloc(30000, 0)));
  const blank = await raster(missing);
  assert.throws(() => assertSingleStrip(blank));
});
