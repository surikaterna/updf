import assert from "node:assert/strict";
import { test } from "node:test";
import { LayoutInputError } from "@updf/layout-boxes";
import { type BoxView, layoutBoxes } from "@updf/layout-boxes/boxes";
import type { PreparedBlock } from "../dist/cjs/protocol.js";
import { compileRow } from "../dist/cjs/row-compiler.js";
import { createLayoutOperation } from "../../../tests/fixtures/text-options.js";
import { sizing } from "../dist/cjs/sizing.js";

function productionRow(child: PreparedBlock): PreparedBlock | undefined {
  const tasks: (() => void)[] = [];
  let prepared: PreparedBlock | undefined;
  compileRow(
    { type: "row", style: { paddingTop: 0.1, height: 0.3 }, children: [{ type: "column", width: 20, children: [] }] },
    80,
    "/row",
    createLayoutOperation({}),
    tasks,
    (_values, _width, _path, target) => target.push(child),
    (block) => {
      prepared = block;
    },
    () => {},
  );
  while (tasks.length) tasks.pop()?.();
  return prepared;
}
test("metric fit differs from native; explicit metric supports host", () => {
  const path = "/row";
  const box = sizing({ paddingTop: 0.1, height: 0.3 }, 80, path);
  const child: PreparedBlock = {
    fragmentation: "atomic",
    naturalSize: { width: 20, height: 0.2 },
    extent: 1,
    fragment: () => ({ height: 0.2, nextOffset: 1, paint: () => [] }),
  };
  const columns = [child];
  const prepared = productionRow(child);
  assert.equal(prepared?.naturalSize.height, 0.3);
  assert.deepEqual(prepared?.rowPlacement?.children, [{ left: 0, top: 0, width: 20, height: 0.2 }]);
  const view: BoxView<typeof columns | PreparedBlock, PreparedBlock> = {
    id: (node) => (node === columns ? "row" : "column"),
    path: (node) => (node === columns ? path : `${path}/children/0`),
    style: (node) =>
      node === columns
        ? { flexDirection: "row", width: box.width, height: 0.3, paddingTop: box.inset.top }
        : { width: child.naturalSize.width },
    childCount: (node) => (node === columns ? columns.length : 0),
    childAt: () => child,
    content: (node) => (node === columns ? undefined : child),
  };
  assert.throws(
    () =>
      layoutBoxes({
        root: columns,
        view,
        width: box.width,
        measure: (content) => ({ height: content.naturalSize.height }),
      }),
    (error) =>
      error instanceof LayoutInputError &&
      error.code === "GEOMETRY" &&
      error.path === path &&
      error.message === "Box height cannot truncate content",
  );
  assert.equal(
    layoutBoxes({
      root: columns,
      view,
      width: box.width,
      containment: "metric",
      measure: (content) => ({ height: content.naturalSize.height }),
    }).boxes[0]?.height,
    0.3,
  );
});
