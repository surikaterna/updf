import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { column, createExtensions, defineBlockAdapter, document, extension, flow, paragraph } from "@updf/layout";
import { layout, measure, render } from "../../../tests/fixtures/text-options.js";

const spacer = (height: number) => ({ type: "spacer" as const, height });
const margins = { top: 0, right: 0, bottom: 0, left: 0 };

test("standalone padded/bordered Column paginates without becoming a finite atomic viewport", () => {
  const item = column({
    style: { padding: 1, border: { width: 1, color: [0, 0, 0] } },
    children: [spacer(6), spacer(6)],
  });
  const result = layout(
    document({ children: flow({ children: [item], pageSize: { width: 80, height: 10 }, margins }) }),
  );
  assert.equal(result.pageCount, 2);
  assert.deepEqual(
    result.placements.map((placement) => placement.box.height),
    [10, 10],
  );
  assert.ok(render(result.document).length > 0);
});

test("standalone keepTogether moves to a fresh page and rejects page controls", () => {
  const item = column({ keepTogether: true, children: [spacer(3), spacer(3)] });
  const result = layout(
    document({ children: flow({ children: [spacer(5), item], pageSize: { width: 80, height: 10 }, margins }) }),
  );
  assert.equal(result.pageCount, 2);
  assert.equal(result.placements[1]?.pageIndex, 1);
  assert.equal(result.placements[1]?.box.height, 6);
  const invalid = column({ keepTogether: true, children: [{ type: "pageBreak" }] });
  assert.throws(
    () => layout(document({ children: flow({ children: [invalid], pageSize: { width: 80, height: 10 }, margins }) })),
    (error) => error instanceof DocumentError && error.diagnostics[0]?.code === "TYPE",
  );
});

test("public hidden fractional Column clamp stays closed and rejects page controls", () => {
  for (const control of [false, true]) {
    const item = column({
      style: { maxHeight: 0.3, overflow: "hidden" },
      children: [spacer(0.1), ...(control ? [{ type: "pageBreak" as const }] : []), spacer(0.2)],
    });
    const input = document({ children: flow({ children: [item], pageSize: { width: 80, height: 0.2 }, margins }) });
    if (control) {
      assert.throws(
        () => layout(document({ children: flow({ children: [item], pageSize: { width: 80, height: 1 }, margins }) })),
        (error) => error instanceof DocumentError && error.diagnostics[0]?.code === "TYPE",
      );
      assert.throws(
        () => measure(item, { width: 80 }),
        (error) =>
          error instanceof DocumentError &&
          error.diagnostics[0]?.code === "TYPE" &&
          error.diagnostics[0]?.path === "/content/0",
      );
    } else {
      assert.throws(
        () => layout(input),
        (error) => error instanceof DocumentError,
      );
      const result = layout(
        document({ children: flow({ children: [item], pageSize: { width: 80, height: 1 }, margins }) }),
      );
      assert.equal(result.pageCount, 1);
      assert.equal(result.placements[0]?.box.height, 0.3);
      assert.ok(render(result.document).length > 0);
    }
  }
});

test("standalone minHeight remains fragmentable blank space, not synthetic definite height", () => {
  const item = column({ style: { minHeight: 0.2 }, children: [] });
  const result = layout(
    document({ children: flow({ children: [item], pageSize: { width: 80, height: 0.1 }, margins }) }),
  );
  assert.deepEqual(
    result.placements.map((placement) => placement.box.height),
    [0.1, 0.1],
  );
});

test("standalone hidden Column measures owned provider content once but emits each occurrence", () => {
  let measures = 0;
  let fragments = 0;
  const content = paragraph({ children: "AB" });
  const adapter = defineBlockAdapter({
    name: "column.owned-content",
    validate: (input) => input,
    measure(_props, context) {
      measures++;
      const measured = context.measureContent(content, { width: context.width });
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: measured.size,
        fragment() {
          fragments++;
          return { status: "placed", nextOffset: 1, height: measured.size.height, nodes: measured.nodes };
        },
      };
    },
  });
  const descriptor = extension(adapter, {});
  const item = column({ style: { height: 4, padding: 1, overflow: "hidden" }, children: [descriptor, descriptor] });
  const input = document({
    children: flow({
      children: [item, item],
      pageSize: { width: 80, height: 10 },
      margins,
      extensions: createExtensions([adapter]),
    }),
  });
  const result = layout(input, { limits: { textCodePoints: 8 } });
  assert.equal(result.pageCount, 1);
  assert.equal(measures, 1);
  assert.equal(fragments, 4);
  assert.deepEqual(
    result.placements.map((placement) => placement.box.height),
    [4, 4],
  );
  assert.equal((new TextDecoder().decode(render(result.document)).match(/\(AB\)/g) ?? []).length, 4);
  assert.throws(
    () => layout(input, { limits: { textCodePoints: 7 } }),
    (error) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
  );
});
