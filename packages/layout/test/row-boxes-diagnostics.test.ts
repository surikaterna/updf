import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createLayoutOperation } from "../../../tests/fixtures/text-options.js";
import { compileRow } from "../dist/cjs/row-compiler.js";
import type { PreparedBlock } from "../dist/cjs/protocol.js";

function prepare(input: Record<string, unknown>, heights: readonly number[] = []): void {
  const tasks: (() => void)[] = [];
  compileRow(
    input,
    80,
    "/row",
    createLayoutOperation({}),
    tasks,
    (_values, width, _path, target) => {
      for (const height of heights) {
        const child: PreparedBlock = {
          fragmentation: "atomic",
          naturalSize: { width, height },
          extent: 1,
          fragment: () => ({ height, nextOffset: 1, paint: () => [] }),
        };
        target.push(child);
      }
    },
    () => {},
    () => {},
  );
  while (tasks.length) tasks.pop()?.();
}

function diagnostic(run: () => void, code: string, path: string): void {
  assert.throws(run, (error) => {
    assert.ok(error instanceof DocumentError);
    assert.equal(error.diagnostics[0]?.code, code);
    assert.equal(error.diagnostics[0]?.path, path);
    return true;
  });
}

test("contradictory Row track bounds retain the authored max path", () => {
  diagnostic(
    () => prepare({ type: "row", children: [{ type: "column", width: { weight: 1, min: 2, max: 1 }, children: [] }] }),
    "GEOMETRY",
    "/row/tracks/0/max",
  );
});

test("empty Row and nonclipping Column inset floors retain overflow diagnostics", () => {
  diagnostic(
    () => prepare({ type: "row", style: { height: 1, paddingTop: 2 }, children: [] }),
    "VERTICAL_OVERFLOW",
    "/row",
  );
  diagnostic(
    () => prepare({ type: "row", children: [{ type: "column", style: { height: 1, paddingTop: 2 }, children: [] }] }),
    "VERTICAL_OVERFLOW",
    "/row/children/0",
  );
});

test("hidden Column inset floors retain geometry diagnostics", () => {
  diagnostic(
    () =>
      prepare({
        type: "row",
        children: [{ type: "column", style: { height: 1, paddingTop: 2, overflow: "hidden" }, children: [] }],
      }),
    "GEOMETRY",
    "/row/children/0",
  );
});

test("nonfinite prepared hidden Column natural height retains its source path", () => {
  diagnostic(
    () =>
      prepare({ type: "row", children: [{ type: "column", style: { height: 1, overflow: "hidden" }, children: [] }] }, [
        Number.MAX_VALUE,
        Number.MAX_VALUE,
      ]),
    "GEOMETRY",
    "/row/children/0",
  );
});
