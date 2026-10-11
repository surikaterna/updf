import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createLayoutOperation } from "../../../tests/fixtures/text-options.js";
import { deferColumnBody } from "../dist/cjs/column-content.js";
import type { PreparedBlock } from "../dist/cjs/protocol.js";
import { compileRow } from "../dist/cjs/row-compiler.js";

function scheduledRows() {
  const operation = createLayoutOperation({});
  const tasks: (() => void)[] = [];
  const events: string[] = [];
  let active = 0;
  let peak = 0;
  const visit = (
    value: Record<string, unknown>,
    width: number,
    path: string,
    finish: (block: PreparedBlock) => void,
  ) => {
    active++;
    peak = Math.max(peak, active);
    events.push(`visit:${path}`);
    if (value.type === "row") {
      compileRow(value, width, path, operation, tasks, schedule, finish, () => {});
    } else {
      const height = value.height as number;
      finish({
        fragmentation: "atomic",
        naturalSize: { width, height },
        extent: 1,
        fragment: () => ({ height, nextOffset: 1, paint: () => [] }),
      });
    }
    active--;
  };
  const schedule = (values: readonly unknown[], width: number, path: string, target: PreparedBlock[]) => {
    for (let i = values.length - 1; i >= 0; i--) {
      tasks.push(() =>
        visit(values[i] as Record<string, unknown>, width, `${path}/${i}`, (block) => target.push(block)),
      );
    }
  };
  return { tasks, events, visit, peak: () => peak };
}

test("nested Row body height becomes available through outer tasks, not during scheduling", () => {
  const state = scheduledRows();
  const nested = { type: "row", children: [{ type: "column", children: [{ type: "spacer", height: 7 }] }] };
  const root = { type: "row", children: [{ type: "column", children: [nested] }] };
  const prepared: PreparedBlock[] = [];
  state.visit(root, 80, "/row", (block) => prepared.push(block));
  assert.equal(prepared.length, 0);
  assert.deepEqual(state.events, ["visit:/row"]);
  assert.equal(state.tasks.length, 2);

  state.tasks.pop()?.();
  assert.equal(prepared.length, 0);
  assert.deepEqual(state.events, ["visit:/row", "visit:/row/children/0/children/0"]);
  // A synchronous measure callback cannot return either body height at these boundaries.
  while (state.tasks.length) state.tasks.pop()?.();
  assert.equal(prepared.length, 1);
  assert.deepEqual(prepared[0]?.naturalSize, { width: 80, height: 7 });
  assert.equal(state.peak(), 1);
});

test("Row sibling inset preflight rejects before any deferred body expands or tasks are scheduled", () => {
  const state = scheduledRows();
  let expansions = 0;
  const first = { type: "column", width: 40, children: [] };
  deferColumnBody(first, () => {
    expansions++;
    return [{ type: "spacer", height: 7 }];
  });
  const second = { type: "column", width: 40, style: { padding: 21 }, children: [] };
  assert.throws(
    () => state.visit({ type: "row", children: [first, second] }, 80, "/row", () => assert.fail("Unexpected Row")),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "GEOMETRY" &&
      error.diagnostics[0]?.path.startsWith("/row/children/1/style") === true,
  );
  assert.equal(expansions, 0);
  assert.equal(state.tasks.length, 0);
});

test("depth-3000 Row completion remains on the existing iterative task scheduler", () => {
  const state = scheduledRows();
  let root: Record<string, unknown> = { type: "spacer", height: 0.25 };
  for (let i = 0; i < 3000; i++) root = { type: "row", children: [{ type: "column", children: [root] }] };
  const prepared: PreparedBlock[] = [];
  state.visit(root, 80, "/row", (block) => prepared.push(block));
  while (state.tasks.length) state.tasks.pop()?.();
  assert.equal(state.peak(), 1);
  assert.deepEqual(prepared[0]?.naturalSize, { width: 80, height: 0.25 });
});
