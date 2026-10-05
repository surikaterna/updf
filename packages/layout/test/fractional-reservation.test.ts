import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { h } from "@updf/core/vdom";
import { Block, document, flow, paragraph, pt } from "@updf/layout";
import { businessTheme } from "../../../examples/business/components.js";
import { invoiceExample } from "../../../examples/business/invoice.js";
import { layout, measure, render, textOptions } from "../../../tests/fixtures/text-options.js";

for (const lineHeight of [pt(12.6), 1.4]) {
  test(`#51 public wrapped paragraph retains its fractional reservation (${JSON.stringify(lineHeight)})`, () => {
    const content = paragraph({
      style: { font: "Helvetica", fontSize: 9, lineHeight },
      children: "hello hello",
    });
    const measured = measure(content, { width: 25 });
    assert.deepEqual(
      measured.lines.map((line) => line.height),
      [12.6, 12.6],
    );
    assert.equal(measured.size.height, 25.2);
    const result = layout(
      document({
        children: flow({
          pageSize: { width: 37, height: 37.2 },
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
          children: h(Block, { style: { padding: 6 }, children: content }),
        }),
      }),
    );
    assert.equal(result.pageCount, 1);
    assert.equal(result.placements[0]?.box.height, 37.2);
    const group = result.document.pages[0]?.children[0];
    assert.equal(group?.type, "paintGroup");
    if (group?.type !== "paintGroup") assert.fail("Expected the allocated Block paint group");
    const lines = Array.from(group.children).filter((node) => node.type === "paintGroup");
    assert.deepEqual(
      lines.map((line) => [line.transform?.[5], line.clip?.height]),
      [
        [6, 12.6],
        [18.6, 12.6],
      ],
    );
    for (const [index, line] of lines.entries()) {
      const text = Array.from(line.children)[0];
      assert.equal(text?.type, "richText");
      if (text?.type !== "richText") assert.fail("Expected native text inside the line group");
      assert.equal(text.height, 9);
      assert.equal(text.y, [1.7999999999999998, 1.799999999999999][index]);
    }
    assert.ok(render(result.document).length > 0);
  });
}

test("#51 exact semantic page edge retains strict native clip bounds", () => {
  assert.throws(
    () =>
      layout(
        document({
          children: flow({
            pageSize: { width: 37, height: 31.2 },
            margins: { top: 0, right: 0, bottom: 0, left: 0 },
            children: h(Block, {
              style: { paddingTop: 6, paddingLeft: 6, paddingRight: 6 },
              children: paragraph({
                style: { font: "Helvetica", fontSize: 9, lineHeight: 1.4 },
                children: "hello hello",
              }),
            }),
          }),
        }),
      ),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "BOUNDS" &&
      error.diagnostics[0]?.path.endsWith("/clip"),
  );
});

test("#51 ordinary invoice with mocked ratio theme renders deterministically", () => {
  const original = businessTheme.text.lineHeight;
  try {
    Reflect.set(businessTheme.text, "lineHeight", 1.4);
    const options = textOptions({});
    const first = invoiceExample(undefined, undefined, options);
    assert.deepEqual(invoiceExample(undefined, undefined, options).bytes, first.bytes);
    assert.ok(first.bytes.length > 0);
  } finally {
    businessTheme.text.lineHeight = original;
  }
});

for (const origin of [0.1, 43.1, 55.2]) {
  test(`#51 nested fractional origins, gaps and borders (${origin})`, () => {
    const result = layout(
      document({
        children: flow({
          pageSize: { width: 100, height: 200 },
          margins: { top: origin, left: 0, right: 0, bottom: 0 },
          children: h(Block, {
            style: { padding: 0.3, gap: 0.2, borderTop: { width: 0.1, color: [0, 0, 0] } },
            children: [1, 2].map(() =>
              h(Block, {
                style: { padding: 6 },
                children: paragraph({
                  style: { font: "Helvetica", fontSize: 9, lineHeight: 1.4 },
                  children: "hello\nhello",
                }),
              }),
            ),
          }),
        }),
      }),
    );
    assert.deepEqual(render(result.document), render(result.document));
  });
}
