import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { type Component, type ComponentContext, h } from "@updf/core/vdom";
import { fixtureFont } from "../../../tests/fixtures/fonts/font-fixture.js";
import {
  layoutTable,
  layoutTableFlowUnknown,
  layoutTableUnknown,
  lower,
  render,
} from "../../../tests/fixtures/text-options.js";
import { tableProofDefinition } from "../../../tests/fixtures/transitional-table-proof.js";
import type { TableDocumentDefinition } from "../dist/tables/index.js";
import { Tables } from "../dist/tables/vdom.js";

function failure(run: () => unknown, code: string, path?: string): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof DocumentError);
    assert.equal(error.diagnostics[0]?.code, code);
    if (path) assert.equal(error.diagnostics[0]?.path, path);
    return true;
  });
}
test("tables use snapshot resources, reject forged handles and close retained lowering contexts", async () => {
  const font = await fixtureFont();
  const input = tableProofDefinition();
  const resources = { Demo: font };
  let retained: ComponentContext | undefined;
  const wrapper: Component<object> = (_props, context) => {
    retained = context;
    Reflect.deleteProperty(resources, "Demo");
    return h(Tables.Document, input);
  };
  const actual = render(lower(h(wrapper, {}), { resources }), { resources: { Demo: font } });
  assert.deepEqual(
    actual,
    render(lower(h(Tables.Document, input), { resources: { Demo: font } }), { resources: { Demo: font } }),
  );
  assert.ok(retained);
  const closed = retained;
  failure(() => Tables.Document(input, closed), "MEASUREMENT_CONTEXT");
  failure(() => lower(h(Tables.Document, input), { resources: { Demo: { ...font } } }), "FONT_RESOURCE");
});
test("table run diagnostic is remapped through the ordinary component source context", () => {
  const input = tableProofDefinition();
  const block = input.body[1];
  assert.ok(block?.type === "table");
  const definition = {
    pageTemplate: input.pageTemplate,
    table: {
      ...block,
      defaults: { ...block.defaults, defaultStyle: { ...block.defaults.defaultStyle, font: "Helvetica" } },
      rows: [{ cells: [{ paragraph: { runs: [{ text: "é" }] } }, { paragraph: { runs: [] } }] }],
    },
  };
  failure(() => lower(h(Tables.Document, definition)), "CHARACTER", "/tree/table/rows/0/cells/0/paragraph/runs/0/text");
});
test("repeated headers cannot amplify generated text beyond optional service caps", () => {
  const cell = (text: string) => ({ paragraph: { runs: [{ text }] } });
  const input: TableDocumentDefinition = {
    pageTemplate: { width: 40000, height: 4, margins: { top: 0, right: 0, bottom: 0, left: 0 } },
    table: {
      type: "table",
      columns: [{ width: 20000 }, { width: 20000 }],
      align: "left",
      repeatHeader: true,
      defaults: {
        defaultStyle: { font: "Helvetica", fontSize: 1, color: [0, 0, 0] },
        lineHeight: 2,
        align: "left",
        whiteSpace: "preserve",
        breakLongWords: "error",
        padding: 0,
      },
      header: { cells: [cell("A".repeat(3000)), cell("B".repeat(3000))] },
      rows: Array.from({ length: 20 }, () => ({ cells: [cell("X"), cell("Y")] })),
    },
  };
  failure(() => layoutTableUnknown(input, { profile: "service" }), "LIMIT", "/table/header");
  failure(() => lower(h(Tables.Document, input), { profile: "service" }), "LIMIT");
});
test("cell text/block caps, empty-table defaults and readonly ownership reject unsafe boundaries", () => {
  const cell = { paragraph: { runs: [{ text: "A" }] } };
  const input = {
    pageTemplate: { width: 100, height: 100, margins: { top: 0, right: 0, bottom: 0, left: 0 } },
    table: {
      type: "table" as const,
      columns: [{ width: 100 }],
      align: "left" as const,
      repeatHeader: false,
      defaults: {
        defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] as const },
        lineHeight: 12,
        align: "left" as const,
        whiteSpace: "preserve" as const,
        breakLongWords: "error" as const,
        padding: 0,
      },
      rows: [{ cells: [cell] }],
    },
  };
  const result = layoutTable(input);
  const bytes = render(result.document);
  assert.equal(Object.isFrozen(cell), false);
  cell.paragraph.runs[0]!.text = "B";
  assert.deepEqual(render(result.document), bytes);
  cell.paragraph.runs[0]!.text = "A".repeat(4097);
  failure(
    () => layoutTable(input, { limits: { textCodePoints: 4096 } }),
    "LIMIT",
    "/table/rows/0/cells/0/paragraph/runs/0/text",
  );
  failure(() => layoutTableUnknown({ ...input, table: { ...input.table, rows: [], defaults: {} } }), "GEOMETRY");
  failure(() => layoutTableFlowUnknown({ ...result }), "KEY");
});
test("blank repeated headers reserve generated nodes rather than an undocumented work cap", () => {
  const input: TableDocumentDefinition = {
    pageTemplate: { width: 100, height: 4004, margins: { top: 0, right: 0, bottom: 0, left: 0 } },
    table: {
      type: "table",
      columns: [{ width: 100 }],
      align: "left",
      repeatHeader: true,
      defaults: {
        defaultStyle: { font: "Helvetica", fontSize: 1, color: [0, 0, 0] },
        lineHeight: 2,
        align: "left",
        whiteSpace: "preserve",
        breakLongWords: "error",
        padding: 0,
      },
      header: { cells: [{ paragraph: { runs: [{ text: "\n".repeat(2000) }] } }] },
      rows: Array.from({ length: 4 }, () => ({ cells: [{ paragraph: { runs: [] } }] })),
    },
  };
  failure(() => layoutTable(input, { limits: { nodes: 6000 } }), "LIMIT", "/table/header");
});
