import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import {
  createExtensions,
  type BlockContent,
  type Extensions,
  defineBlockAdapter,
  document,
  extension,
  fixed,
  flow,
  layout,
  type MeasureContext,
  measure,
  pageSize,
} from "@updf/layout";

const native = fixed({
  height: 7,
  children: [{ type: "rect", x: 0, y: 0, width: 3, height: 7, paint: { stroke: null } }],
});
const inner = defineBlockAdapter({
  name: "test.nested-next.inner",
  validate: (input) => input,
  measure(_props, context) {
    return {
      fragmentation: "atomic",
      extent: 1,
      naturalSize: { width: context.width, height: 7 },
      next: () => ({ end: 1, height: 7, nodes: native.children }),
    };
  },
});
const middle = defineBlockAdapter({
  name: "test.nested-next.middle",
  validate: (input) => input,
  measure(_props, context) {
    return {
      fragmentation: "atomic",
      extent: 1,
      naturalSize: { width: context.width, height: 7 },
      next() {
        const result = context.measureContent(extension(inner, {}), { width: context.width });
        return { end: 1, height: result.size.height, nodes: result.nodes };
      },
    };
  },
});

function paginate(content: BlockContent, extensions: Extensions) {
  return layout(
    document({
      children: flow({
        pageSize: pageSize(100, 100),
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        extensions,
        children: content,
      }),
    }),
  );
}

for (const entry of ["measure", "layout"] as const) {
  for (const mode of ["nested-next", "nested-next-deep", "fixed-next", "nested-eager"] as const) {
    test(`${entry}: ${mode} content uses the owning public measurement context`, () => {
      let retained: MeasureContext | undefined;
      const outer = defineBlockAdapter({
        name: "test.nested-next.outer",
        validate: (input) => input,
        measure(_props, context) {
          retained = context;
          const content = mode === "fixed-next" ? native : extension(mode === "nested-next-deep" ? middle : inner, {});
          const read = () => context.measureContent(content, { width: context.width });
          const eager = mode === "nested-eager" ? read() : undefined;
          return {
            fragmentation: "atomic",
            extent: 1,
            naturalSize: { width: context.width, height: 7 },
            next() {
              const result = eager ?? read();
              assert.deepEqual(result.size, { width: 80, height: 7 });
              assert.ok(result.nodes.length > 0);
              return { end: 1, height: result.size.height, nodes: result.nodes };
            },
          };
        },
      });
      const extensions = createExtensions([outer, middle, inner]);
      const content = extension(outer, {});
      if (entry === "measure") {
        const result = measure(content, { width: 80 }, { extensions });
        assert.deepEqual(result.size, { width: 80, height: 7 });
      } else {
        const result = paginate(content, extensions);
        assert.equal(result.pageCount, 1);
        assert.deepEqual(result.placements[0]?.box, { x: 10, y: 10, width: 80, height: 7 });
        assert.ok(result.document.pages[0]?.children.length);
        assert.ok(render(result.document).length > 0);
      }
      assert.throws(() => retained!.measureContent(native, { width: 80 }), /closed/);
    });
  }
}

for (const entry of ["measure", "layout"] as const) {
  for (const caught of [false, true]) {
    test(`${entry}: nested failure (caught=${caught}) closes retained contexts and never publishes`, () => {
      const original = new DocumentError("VALUE", "/nested-original", "intentional");
      const retained: MeasureContext[] = [];
      const failing = defineBlockAdapter({
        name: "test.nested-next.failing",
        validate: (input) => input,
        measure(_props, context) {
          retained.push(context);
          return {
            fragmentation: "atomic",
            extent: 1,
            naturalSize: { width: context.width, height: 7 },
            next() {
              throw original;
            },
          };
        },
      });
      const outer = defineBlockAdapter({
        name: "test.nested-next.failed-outer",
        validate: (input) => input,
        measure(_props, context) {
          retained.push(context);
          return {
            fragmentation: "atomic",
            extent: 1,
            naturalSize: { width: context.width, height: 7 },
            next() {
              const read = () => context.measureContent(extension(failing, {}), { width: context.width });
              if (caught) assert.throws(read, (error) => error === original);
              else read();
              return { end: 1, height: 7, nodes: [] };
            },
          };
        },
      });
      const extensions = createExtensions([outer, failing]);
      const content = extension(outer, {});
      const run = () =>
        entry === "measure" ? measure(content, { width: 80 }, { extensions }) : paginate(content, extensions);
      assert.throws(run, (error) => (caught ? error instanceof DocumentError : error === original));
      assert.equal(retained.length, 2);
      for (const context of retained) {
        assert.throws(() => context.measureContent(native, { width: 1 }), /closed/);
        assert.throws(() => context.chargeSourceWork(0, "/retained"), /closed/);
      }
    });
  }
}
