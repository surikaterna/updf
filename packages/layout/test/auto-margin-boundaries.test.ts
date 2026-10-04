import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { h } from "@updf/core/vdom";
import { Block, block, document, Flow, flow, layout, measure, paragraph } from "@updf/layout";

const margins = { top: 0, right: 0, bottom: 0, left: 0 };
const text = () => paragraph({ children: "tail", style: { fontSize: 10, lineHeight: 1 } });
const run = (children: NonNullable<Parameters<typeof flow>[0]["children"]>) =>
  layout(document({ children: flow({ pageSize: { width: 100, height: 100 }, margins, children }) }));

test("#53 max-only natural region never aligns or borrows measure constraint height", () => {
  const child = h(Block, { keepTogether: true, style: { marginTop: "auto", height: 10 }, children: text() });
  for (const props of [{}, { keepTogether: true }, { style: { maxHeight: 100 } }, { style: { minHeight: 100 } }]) {
    const content = h(Block, { ...props, children: child });
    assert.equal(measure(content, { width: 100, height: 200 }).lines[0]?.top, 0);
  }
});

test("#53 compiled explicit region drives lines and paint despite outer reservations", () => {
  const content = h(Block, {
    style: { height: 80, padding: 5, gap: 5 },
    children: [
      h(Block.Footer, { height: 10, children: null }),
      block({ style: { height: 20 }, children: [] }),
      h(Block, { keepTogether: true, style: { height: 10, marginTop: "auto" }, children: text() }),
      h(Block.Header, { height: 10, children: null }),
    ],
  });
  const measured = measure(content, { width: 100 });
  assert.equal(measured.size.height, 100);
  assert.equal(measured.lines[0]?.top, 75);
  assert.equal(run(content).placements[0]?.box.height, 100);
  assert.ok(render(run(content).document).length > 0);
});

test("#53 no ancestor may clip an aligned child or explicit alignment parent to fit", () => {
  const child = h(Block, { keepTogether: true, style: { height: 20, marginTop: "auto" }, children: text() });
  const parent = h(Block, { style: { height: 50 }, children: child });
  for (const nested of [child, parent, h(Block, { children: parent })])
    assert.throws(
      () => run(h(Block, { style: { maxHeight: 10, overflow: "hidden" }, children: nested })),
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "VERTICAL_OVERFLOW",
    );
});

test("#53 native clipping page-edge negative control remains strict even with exact zero auto margin", () => {
  assert.throws(
    () =>
      layout(
        document({
          children: flow({
            pageSize: { width: 37, height: 31.2 },
            margins,
            children: h(Block, {
              keepTogether: true,
              style: { paddingTop: 6, paddingLeft: 6, paddingRight: 6, marginTop: "auto" },
              children: paragraph({ style: { fontSize: 9, lineHeight: 1.4 }, children: "hello hello" }),
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

test("#53 accessor margins reject without invoking getters and unknown box fields remain rejected", () => {
  let calls = 0;
  const style = Object.defineProperty({}, "marginTop", {
    enumerable: true,
    get() {
      calls++;
      return "auto";
    },
  });
  assert.throws(() => run(h(Block, { keepTogether: true, style, children: [] })), DocumentError);
  assert.equal(calls, 0);
  assert.throws(
    () => run(h(Block, { keepTogether: true, style: { marginTop: "auto", marginBottom: 2 } as never, children: [] })),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "KEY",
  );
});

test("#53 data snapshots and source intervals do not acquire a synthetic margin item", () => {
  const style = { height: 20, marginTop: "auto" as const };
  const child = block({ keepTogether: true, style, children: [] });
  style.height = 90;
  const result = run([block({ style: { height: 30 }, children: [] }), child]);
  assert.deepEqual(
    result.placements.map((p) => [p.sourceIndex, p.sourceRange, p.box.y, p.box.height]),
    [
      [0, { start: 0, end: 1 }, 0, 30],
      [1, { start: 0, end: 1 }, 80, 20],
    ],
  );
  assert.equal(Object.isFrozen(style), false);
  assert.equal(Object.isFrozen(result), true);
});

test("#53 small node budget fails before forbidden final callbacks, without repagination", () => {
  let callbacks = 0;
  const forbidden = () => {
    callbacks++;
    throw new Error("Forbidden final callback");
  };
  const content = document({
    children: flow({
      pageSize: { width: 100, height: 100 },
      margins,
      children: [
        h(Block, { keepTogether: true, style: { marginTop: "auto", height: 20 }, children: text() }),
        h(Flow.Footer, { height: 10, children: h(forbidden, {}) }),
      ],
    }),
  });
  assert.throws(
    () => layout(content, { profile: "service", limits: { nodes: 2 } }),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
  );
  assert.equal(callbacks, 0);
});
