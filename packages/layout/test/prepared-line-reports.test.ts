import assert from "node:assert/strict";
import test from "node:test";
import { policy } from "@updf/core/internal";
import {
  block,
  column,
  createExtensions,
  defineBlockAdapter,
  extension,
  paragraph,
  row,
  type ContentLine,
} from "@updf/layout";
import { measure } from "../../../tests/fixtures/text-options.js";
import { OutputBudget } from "../dist/cjs/budget.js";
import { fragmentGeometry, prepareFragmentPaint } from "../dist/cjs/fragment-paint-preparation.js";
import { collectPreparedLines } from "../dist/cjs/prepared-line-reports.js";
import type { PlacedFragment } from "../dist/cjs/protocol.js";

test("line reports follow selected preceding heights, not natural-size hints", () => {
  const adapter = defineBlockAdapter({
    name: "report.actual-height",
    validate: () => ({}),
    measure: () => ({
      fragmentation: "atomic",
      naturalSize: { width: 1, height: 10 },
      extent: 1,
      next: () => ({ end: 1, height: 1, nodes: [] }),
    }),
  });
  const extensions = createExtensions([adapter]);
  const children = [extension(adapter, {}), paragraph({ children: "after" })];
  assert.equal(measure(children, { width: 100 }, { adapters: extensions }).lines[0]!.top, 1);
  const nested = block({ style: { padding: 1 }, children });
  assert.equal(measure(nested, { width: 100 }, { adapters: extensions }).lines[0]!.top, 2);
});

test("equal-height Row line reports retain logical left-to-right source order", () => {
  const content = row({
    children: [
      column({ width: 50, children: [paragraph({ children: "left" })] }),
      column({ width: 50, children: [paragraph({ children: "right" })] }),
    ],
  });
  const lines = measure(content, { width: 100 }).lines;
  assert.equal(lines.length, 2);
  assert.equal(lines[0]!.top, lines[1]!.top);
  assert.equal(lines[0]!.fragments[0]!.x, 0);
  assert.equal(lines[1]!.fragments[0]!.x, 50);
  assert.ok(Object.isFrozen(lines) && Object.isFrozen(lines[0]!.fragments));
});

test("reports consume frozen prepared native transforms and source-relative baselines", () => {
  const line: ContentLine = {
    top: 100,
    height: 1,
    baseline: 100.75,
    advance: 1,
    inkBounds: { empty: false, left: 0, right: 1, top: 100.25, bottom: 101 },
    fragments: [],
    breakReason: "paragraphEnd",
  };
  const child: PlacedFragment = {
    height: 1,
    nextOffset: 1,
    geometry: fragmentGeometry([{ offset: 0, height: 1, reservation: "whole-box", line }]),
    paint: () => assert.fail("reporting must not paint"),
  };
  const parent: PlacedFragment = {
    height: 2,
    nextOffset: 1,
    geometry: fragmentGeometry([], [{ fragment: child, x: 0.4, y: 0.4, frame: "local" }]),
    paint: () => assert.fail("reporting must not paint"),
  };
  const prepared = prepareFragmentPaint(parent, { x: 0.2, y: 0.2 }, new OutputBudget(policy()), "/report");
  const output: ContentLine[] = [];
  collectPreparedLines(prepared.root, output);
  assert.ok(Object.isFrozen(prepared.root.context.children[0]!.context.incomingMatrix));
  assert.equal(output[0]!.top, 0.2 + 0.4);
  assert.equal(output[0]!.baseline, 0.75 + (0.2 + 0.4));
  const ink = output[0]!.inkBounds;
  assert.equal(ink.empty, false);
  if (!ink.empty) assert.equal(ink.left, 0.2 + 0.4);
  assert.equal(line.top, 100);
});
