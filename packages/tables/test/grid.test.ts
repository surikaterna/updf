import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { type NodeDefinition, render } from "@updf/core";
import { type TableInput, table, tableExtension } from "@updf/tables";
import { block, createExtensions, layoutFlow } from "../../../tests/fixtures/transitional-layout.js";

const row = { minHeight: 20, cells: [{}, {}] } as const;
const base: TableInput = {
  columns: [{ width: 40 }, { width: 40 }],
  style: { padding: 0 },
  grid: { width: 2, color: [0, 0, 0] },
  body: [row],
};
function run(input: TableInput, height = 100) {
  return layoutFlow(
    {
      pageTemplate: { width: 100, height, margins: { top: 10, right: 10, bottom: 10, left: 10 } },
      body: [table(input)],
    },
    {},
    createExtensions([tableExtension]),
  );
}
function bands(nodes: readonly NodeDefinition[], x = 0, y = 0): number[][] {
  return nodes.flatMap((node) => {
    assert.notEqual(node.type, "line", "legacy grid strokes must not survive");
    if (node.type === "paintGroup")
      return bands(node.children, x + (node.transform?.[4] ?? 0), y + (node.transform?.[5] ?? 0));
    return node.type === "rect" && node.paint?.fill?.every((value) => value === 0)
      ? [[x + node.x, y + node.y, node.width, node.height]]
      : [];
  });
}
function horizontal(values: number[][]) {
  return values.filter((value) => value[2]! > value[3]!);
}

for (const headDeferred of [false, true])
  for (const footDeferred of [false, true]) {
    test(`B1 touching grid has one owned seam and unchanged inset/endpoints (head=${headDeferred}, foot=${footDeferred})`, () => {
      const result = run({
        ...base,
        head: { rows: [row], ...(headDeferred ? { height: 20 } : {}) },
        foot: { rows: [row], ...(footDeferred ? { height: 20 } : {}) },
      });
      const values = bands(result.document.pages[0]!.children);
      assert.deepEqual(horizontal(values), [
        [12, 11, 76, 2],
        [12, 29, 76, 2],
        [12, 49, 76, 2],
        [12, 67, 76, 2],
      ]);
      assert.deepEqual(
        values.filter((value) => value[2] === 2),
        [
          [11, 12, 2, 56],
          [49, 12, 2, 56],
          [87, 12, 2, 56],
        ],
      );
      assert.equal(result.placements[0]!.box.height, 60);
      assert.ok(render(result.document).length);
    });
  }
test("B1 short reserved roots retain a real gap, inset body top and adjacency-dependent endpoints", () => {
  const result = run({ ...base, head: { height: 30, rows: [row] }, foot: { height: 30, rows: [row] } });
  const values = bands(result.document.pages[0]!.children);
  assert.deepEqual(horizontal(values), [
    [12, 11, 76, 2],
    [12, 27, 76, 2],
    [12, 41, 76, 2],
    [12, 59, 76, 2],
    [12, 77, 76, 2],
  ]);
  assert.deepEqual(
    values.filter((value) => value[0] === 11),
    [
      [11, 12, 2, 16],
      [11, 42, 2, 36],
    ],
  );
  assert.equal(result.placements[0]!.box.height, 80);
});
test("B1 no-body head/foot share only touching actual roots; empty sections invent no edge", () => {
  for (const deferred of [false, true]) {
    const section = { rows: [row], ...(deferred ? { height: 20 } : {}) };
    const values = bands(run({ ...base, body: [], head: section, foot: section }).document.pages[0]!.children);
    assert.deepEqual(horizontal(values), [
      [12, 11, 76, 2],
      [12, 29, 76, 2],
      [12, 47, 76, 2],
    ]);
  }
  assert.deepEqual(bands(run({ ...base, body: [], head: { height: 20, rows: [] } }).document.pages[0]!.children), []);
  assert.deepEqual(horizontal(bands(run({ ...base, head: { height: 20, rows: [] } }).document.pages[0]!.children)), [
    [12, 31, 76, 2],
    [12, 47, 76, 2],
  ]);
});
test("B1 repeated sections coordinate each page independently with exactly one seam per shared interval", () => {
  for (const deferred of [false, true]) {
    const section = { repeat: true, rows: [row], ...(deferred ? { height: 20 } : {}) };
    const result = run({ ...base, body: Array.from({ length: 5 }, () => row), head: section, foot: section }, 80);
    assert.equal(result.pageCount, 5);
    for (const page of result.document.pages)
      assert.deepEqual(horizontal(bands(page.children)), [
        [12, 11, 76, 2],
        [12, 29, 76, 2],
        [12, 49, 76, 2],
        [12, 67, 76, 2],
      ]);
  }
});
test("B1 clipped content keeps visible grid claims without inventing a cut edge; backgrounds precede borders", () => {
  const input: TableInput = {
    ...base,
    style: { padding: 0, backgroundColor: [1, 0, 0], height: 4, overflow: "hidden" },
    body: [{ minHeight: 40, cells: [{ children: "Clipped" }, {}] }],
  };
  const result = layoutFlow(
    {
      pageTemplate: { width: 100, height: 100, margins: { top: 10, right: 10, bottom: 10, left: 10 } },
      body: [block({ style: { height: 30, overflow: "hidden" }, children: [table(input)] })],
    },
    {},
    createExtensions([tableExtension]),
  );
  const values = bands(result.document.pages[0]!.children);
  assert.deepEqual(horizontal(values), [
    [12, 11, 76, 2],
    [12, 47, 76, 2],
  ]);
  assert.ok(!horizontal(values).some((value) => value[1] === 39));
  const paints: string[] = [];
  const visit = (nodes: readonly NodeDefinition[]): void => {
    for (const node of nodes) {
      if (node.type === "paintGroup") visit(node.children);
      else if (node.type === "rect") paints.push(JSON.stringify(node.paint?.fill));
    }
  };
  visit(result.document.pages[0]!.children);
  assert.deepEqual(paints.slice(0, 2), ["[1,0,0]", "[1,0,0]"]);
  assert.ok(paints.slice(2).every((paint) => paint === "[0,0,0]"));
  assert.ok(render(result.document).length);
});
test("B1 real table PDF raster retains a two-pixel shared strip; missing/doubled/displaced controls reject", async () => {
  const result = run({ ...base, head: { height: 20, rows: [row] }, foot: { rows: [row] } });
  const directory = await mkdtemp(join(tmpdir(), "updf-b1-grid-"));
  try {
    await writeFile(join(directory, "table.pdf"), render(result.document));
    execFileSync("pdftoppm", [
      "-r",
      "72",
      "-aa",
      "no",
      "-aaVector",
      "no",
      "-singlefile",
      join(directory, "table.pdf"),
      join(directory, "table"),
    ]);
    const ppm = await readFile(join(directory, "table.ppm"));
    const header = /^P6\s+100 100\s+255\s/u.exec(ppm.subarray(0, 30).toString("ascii"));
    assert.ok(header);
    const pixels = ppm.subarray(header[0].length);
    const check = (sample: (y: number) => number) => {
      for (let y = 25; y < 35; y++) assert.equal(sample(y), y === 29 || y === 30 ? 0 : 255);
    };
    check((y) => pixels[(y * 100 + 30) * 3]!);
    assert.throws(() => check(() => 255));
    assert.throws(() => check((y) => (y >= 28 && y <= 31 ? 0 : 255)));
    assert.throws(() => check((y) => (y === 30 || y === 31 ? 0 : 255)));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
