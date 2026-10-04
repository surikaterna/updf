import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { block, measure, paragraph } from "@updf/layout";

test("#49-C scalar padding and explicit edges are independent of key enumeration", () => {
  for (const style of [
    { padding: 5, paddingTop: 2 },
    { paddingTop: 2, padding: 5 },
  ]) {
    const result = measure(block({ style, children: [paragraph({ children: "A" })] }), { width: 100 });
    assert.equal(result.size.height, 17);
    assert.equal(result.lines[0]!.top, 2);
    assert.equal(result.lines[0]!.fragments[0]!.x, 5);
  }
  const result = measure(
    block({
      style: { padding: 5, paddingRight: 8, paddingBottom: 3, paddingLeft: 7 },
      children: [paragraph({ children: "A" })],
    }),
    { width: 100 },
  );
  assert.equal(result.size.height, 18);
  assert.equal(result.lines[0]!.fragments[0]!.x, 7);
});

test("#49-C box properties reserve only their owning box, never descendants", () => {
  const result = measure(
    block({
      style: { padding: 2, border: { width: 1, color: [0, 1, 0] }, backgroundColor: [1, 1, 0] },
      children: [block({ children: [paragraph({ children: "A" })] })],
    }),
    { width: 100 },
  );
  assert.equal(result.size.height, 16);
  assert.equal(result.lines[0]!.top, 3);
  assert.equal(result.lines[0]!.fragments[0]!.x, 3);
  assert.deepEqual(
    result.lines[0]!.fragments[0]!.role === "text" && result.lines[0]!.fragments[0]!.style.color,
    [0, 0, 0],
  );
});

test("#49-C unknown, obsolete, undefined and invalid box styles reject", () => {
  for (const style of [
    { background: [1, 1, 0] },
    { padding: { top: 1, right: 1, bottom: 1, left: 1 } },
    { paddingTop: undefined },
    { paddingLeft: -1 },
    { paddingRight: Infinity },
    { paddingBottom: NaN },
    { backgroundColor: [2, 0, 0] },
    { fontSize: 12 },
    { borderTop: { width: 1, color: [0, 0, 2] } },
  ])
    assert.throws(() => measure(block({ style, children: [] } as never), { width: 100 }), DocumentError);
});
