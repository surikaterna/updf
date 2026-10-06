import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createContext, h, useContext } from "@updf/core/vdom";
import {
  Block,
  block,
  Column,
  createExtensions,
  defineBlockAdapter,
  document,
  extension,
  Flow,
  FragmentContext,
  flow,
  PageContext,
  paragraph,
  Row,
} from "@updf/layout";
import { layout, measure, render } from "../../../tests/fixtures/text-options.js";
import { richInput } from "../../../tests/fixtures/rich-input.js";

const margins = { top: 0, right: 0, bottom: 0, left: 0 };
const Theme = createContext("default");
const empty = (height: number) => block({ children: [], style: { height } });
const run = (
  children: NonNullable<Parameters<typeof flow>[0]["children"]>,
  extensions?: Parameters<typeof flow>[0]["extensions"],
) =>
  layout(
    document({
      children: flow({
        pageSize: { width: 100, height: 100 },
        margins,
        children,
        ...(extensions ? { extensions } : {}),
      }),
    }),
  );

test("#53 complete direct/slot body eligibility rejects before any adapter measurement or final callback", () => {
  let measurements = 0,
    fragments = 0,
    finals = 0;
  const adapter = defineBlockAdapter({
    name: "auto-preflight",
    validate: (value) => value,
    measure() {
      measurements++;
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 100, height: 10 },
        fragment() {
          fragments++;
          return { status: "placed", nextOffset: 1, height: 10, nodes: [] };
        },
      };
    },
  });
  const final = () => {
    finals++;
    return null;
  };
  const invalid = [
    extension(adapter, {}),
    h(Block, { keepTogether: true, style: { marginTop: "auto" }, children: [] }),
    empty(0),
  ];
  for (const children of [invalid, h(Flow.Body, { children: invalid })])
    assert.throws(
      () => run([h(Flow.Footer, { height: 10, children: h(final, {}) }), children], createExtensions([adapter])),
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "VDOM_HIERARCHY",
    );
  assert.deepEqual([measurements, fragments, finals], [0, 0, 0]);
});

test("#53 full measured height is fitted before callbacks and accepted callback sees the aligned offset once", () => {
  const requests: { offset: number; availableHeight: number }[] = [];
  const adapter = defineBlockAdapter({
    name: "auto-once",
    validate: (value) => value,
    measure: () => ({
      fragmentation: "atomic",
      extent: 1,
      naturalSize: { width: 100, height: 20 },
      fragment(request) {
        requests.push(request);
        return { status: "placed", nextOffset: 1, height: 20, nodes: [] };
      },
    }),
  });
  const result = run(
    [empty(90), h(Block, { keepTogether: true, style: { marginTop: "auto" }, children: extension(adapter, {}) })],
    createExtensions([adapter]),
  );
  assert.equal(result.pageCount, 2);
  assert.equal(result.placements[1]?.box.y, 80);
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.offset, 0);
  assert.equal(requests[0]?.availableHeight, 20);
});

test("#53 reused terminal owners capture providers; page/fragment callbacks run once after pagination", () => {
  const calls: unknown[] = [];
  function final() {
    calls.push([useContext(Theme), useContext(PageContext), useContext(FragmentContext)]);
    return h("richText", {
      x: 0,
      y: 0,
      height: 10,
      ...richInput(useContext(Theme), 80, 10, 10),
    });
  }
  const shared = h(Block, {
    keepTogether: true,
    style: { marginTop: "auto", height: 10 },
    children: [h(Block.Header, { height: 10, children: h(final, {}) }), h(Block.Body, { children: [] })],
  });
  const content = document({
    children: ["red", "blue"].map((value) =>
      h(Theme.Provider, {
        value,
        children: h(Flow, { pageSize: { width: 100, height: 100 }, margins, children: [empty(90), shared] }),
      }),
    ),
  });
  const result = layout(content);
  assert.equal(result.pageCount, 4);
  assert.deepEqual(
    result.placements.filter((p) => p.box.height === 20).map((p) => [p.pageIndex, p.box.y]),
    [
      [1, 80],
      [3, 80],
    ],
  );
  assert.deepEqual(
    calls.map((call) => (call as unknown[])[0]),
    ["red", "blue"],
  );
  for (const call of calls) assert.deepEqual((call as unknown[])[2], { index: 0, count: 1, first: true, last: true });
  calls.length = 0;
  assert.throws(
    () => layout(content, { profile: "service", limits: { pages: 1 } }),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
  );
  assert.equal(calls.length, 0);
});

test("#53 Row/Column add no alignment region but nested explicit Block does", () => {
  const leaf = h(Block, {
    keepTogether: true,
    style: { marginTop: "auto", height: 10 },
    children: paragraph({ children: "tail", style: { fontSize: 10, lineHeight: 1 } }),
  });
  const natural = h(Row, { style: { height: 100 }, children: h(Column, { style: { height: 100 }, children: leaf }) });
  assert.equal(measure(natural, { width: 100 }).lines[0]?.top, 0);
  const definite = h(Row, { children: h(Column, { children: h(Block, { style: { height: 100 }, children: leaf }) }) });
  assert.equal(measure(definite, { width: 100 }).lines[0]?.top, 90);
});

for (const origin of [0.1, 43.1, 55.2]) {
  test(`#53 fractional nested origin/gap retains certified native paint (${origin})`, () => {
    const content = h(Block, {
      style: { height: 80, padding: 0.3, gap: 0.2, borderTop: { width: 0.1, color: [0, 0, 0] } },
      children: [
        empty(10.3),
        h(Block, {
          keepTogether: true,
          style: { marginTop: "auto", padding: 6 },
          children: paragraph({ style: { fontSize: 9, lineHeight: 1.4 }, children: "hello\nhello" }),
        }),
      ],
    });
    const result = layout(
      document({
        children: flow({
          pageSize: { width: 100, height: 200 },
          margins: { ...margins, top: origin },
          children: content,
        }),
      }),
    );
    assert.deepEqual(render(result.document), render(result.document));
    const measured = measure(content, { width: 100 });
    assert.deepEqual(
      measured.lines.map((line) => line.height),
      [12.6, 12.6],
    );
    const firstLine = measured.lines[0];
    assert.ok(firstLine && firstLine.top > 40);
  });
}
