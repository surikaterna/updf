import { render } from "@updf/core";
import { createExtensions, document, flow, layout, measure, pageSize, paragraph, pt, span } from "@updf/layout";
import { MetricSum, exceeds, sum } from "@updf/layout-boxes/arithmetic";
import { layoutBoxes, viewBox } from "@updf/layout-boxes/boxes";
import { createFragmentOperation } from "@updf/layout-boxes/fragmentation";
import { alignedTop, derivedAxis, materializedStart } from "@updf/layout-boxes/geometry";
import { bits, dyadic, floorDyadic, spacing, successor, value } from "@updf/layout-boxes/numeric";
import { table, tableExtension } from "@updf/tables";
import { textOptions } from "../fixtures/text-options.js";

export function authorMeasuredDocument() {
  const content = paragraph({
    style: { lineHeight: pt(12) },
    children: ["Measured ", span({ children: "text", style: { color: [1, 0, 0] } })],
  });
  const options = textOptions({});
  const metrics = measure(content, { width: 180, height: 24 }, options);
  const result = layout(
    document({
      children: flow({
        pageSize: pageSize(200, 100),
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        children: content,
      }),
    }),
    options,
  );
  return { metrics, result, bytes: render(result.document, options) };
}

export function authorPagedTable() {
  const extensions = createExtensions([tableExtension]);
  const content = table({
    columns: [{ width: 60 }, { width: { weight: 1 } }],
    head: { repeat: true, rows: [{ cells: [{ children: "Item" }, { children: "Count" }] }] },
    body: Array.from({ length: 5 }, (_, index) => ({
      key: `item-${index}`,
      minHeight: 20,
      cells: [{ children: `Item ${index}` }, { children: index }],
    })),
  });
  return layout(
    document({
      children: flow({
        pageSize: { width: 160, height: 80 },
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        extensions,
        children: content,
      }),
    }),
    textOptions({}),
  );
}

export function placeHostBoxes() {
  const root = { id: "root", height: 10 };
  const boxes = layoutBoxes({
    root,
    width: 40,
    view: {
      id: (node) => node.id,
      path: (node) => `/${node.id}`,
      style: () => ({}),
      childCount: () => 0,
      childAt: () => root,
      content: (node) => node,
    },
    measure: (content) => ({ height: content.height }),
  });
  const placed = viewBox({
    width: 40,
    height: 20,
    paddingTop: 2,
    paddingRight: 0,
    paddingBottom: 2,
    paddingLeft: 0,
    gap: 2,
    alignItems: "center",
    childCount: 2,
    childAt: () => ({ width: 10, height: 10 }),
    path: "/row",
  });
  return { root, boxes, placed };
}

export function fragmentHostUnits() {
  const operation = createFragmentOperation<string, string>({
    next: (text, request, work) => {
      work.consume(1);
      return { end: request.offset + 1, height: 10, content: text[request.offset]! };
    },
  });
  const source = {
    id: "text",
    path: "/text",
    descriptor: "abc",
    extent: 3,
    mode: "splittable" as const,
    width: { mode: "reflow" as const },
  };
  try {
    const cursor = operation.start({ count: 1, at: () => source });
    const first = operation.fragment(cursor, { id: "one", width: 40, height: 20, usedHeight: 0 });
    const last = operation.fragment(first.cursor, { id: "two", width: 40, height: 20, usedHeight: 0 });
    return { first, last, counts: operation.counts() };
  } finally {
    operation.close();
  }
}

export function certifyHostMetrics() {
  const axis = derivedAxis(2, 20, "/axis");
  const accumulator = new MetricSum();
  accumulator.add(10);
  accumulator.add(2);
  const encoded = bits(12);
  return {
    axis,
    start: materializedStart(axis, 0, 10, "/axis"),
    top: alignedTop(2, 2, 4, 20, 10, "center", "/axis"),
    total: accumulator.value,
    sum: sum([10, 2]),
    fits: !exceeds(12, 20),
    roundtrip: value(floorDyadic(dyadic(encoded))!),
    next: value(successor(encoded)!),
    step: spacing(encoded),
  };
}
