import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createLayoutOperation, createOperationCapability, defineOperationExtension } from "@updf/core/internal";
import { h, type VNode } from "@updf/core/vdom";
import {
  Block,
  Column,
  Document,
  Flow,
  Row,
  createExtensions,
  defineBlockAdapter,
  defineInlineAdapter,
  extension,
  inline,
  paragraph,
  layout,
  measure,
} from "@updf/layout";
import { resolveInstallation } from "../dist/cjs/extensions.js";
import { testVisual } from "./visual-fixture.js";
import { table, tableExtension } from "@updf/tables";
import { textOptions } from "../../../tests/fixtures/text-options.js";

const install = (set: object) =>
  defineOperationExtension(
    {},
    createOperationCapability(() => () => ({})),
    set,
  );
const visual = testVisual();
const node = () => h(visual.Component, { tone: "blue", style: { width: 20, height: 10 } });
const document = (children: VNode | readonly VNode[], extensions?: ReturnType<typeof createExtensions>) =>
  h(Document, {
    children: h(Flow, {
      pageSize: { width: 100, height: 100 },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      ...(extensions ? { extensions } : {}),
      children,
    }),
  });
test("central owned adapter sets reach normal content, nested Row/Column, regions and natural measurement", () => {
  const options = { extensions: [install(visual.adapters)] };
  for (const child of [node(), h(Block, { children: node() }), h(Row, { children: h(Column, { children: node() }) })]) {
    assert.equal(layout(document(child), options).pageCount, 1);
    assert.equal(measure(child, { width: 100 }, options).size.height, 10);
  }
  const regions = document([
    h(Flow.Header, { height: 10, children: node() }),
    h(Flow.Body, { children: node() }),
    h(Flow.Footer, { height: 10, children: node() }),
  ]);
  assert.equal(layout(regions, options).document.pages[0]!.children.length, 3);
  assert.equal(measure(node(), { width: 100 }, { ...options, adapters: visual.adapters }).size.height, 10);
});
test("same identities merge idempotently, different same-name identities reject before any measure callback", () => {
  let calls = 0;
  const first = testVisual("test.same", () => calls++);
  const other = testVisual("test.same", () => calls++);
  const child = h(first.Component, { tone: "blue" });
  assert.doesNotThrow(() =>
    layout(document(child, first.adapters), {
      extensions: [install(first.adapters), install(first.adapters)],
    }),
  );
  calls = 0;
  for (const options of [
    { extensions: [install(first.adapters), install(other.adapters)] },
    { extensions: [install(first.adapters)], adapters: other.adapters },
  ]) {
    assert.throws(() => measure(child, { width: 100 }, options), DocumentError);
    assert.equal(calls, 0);
  }
});
test("unrelated and forged contributions do not install descriptors; options snapshot ignores later array mutation", () => {
  for (const contribution of [{}, Object.freeze({ name: "test.visual" })])
    assert.throws(() => layout(document(node()), { extensions: [install(contribution)] }), DocumentError);
  const selected = [install(visual.adapters)];
  const child = h(() => {
    selected.length = 0;
    return node();
  }, {});
  assert.equal(layout(document(child), { extensions: selected }).pageCount, 1);
});
test("installation is reused for the current operation and exact local identity", () => {
  const adapter = defineBlockAdapter({
    name: "extra",
    validate: (p) => p,
    measure: () => {
      throw new Error("unused");
    },
  });
  const local = createExtensions([adapter]);
  const operation = createLayoutOperation({ extensions: [install(visual.adapters)] });
  try {
    assert.equal(resolveInstallation(operation, local), resolveInstallation(operation, local));
    assert.throws(
      () =>
        measure(
          extension(adapter, {}),
          { width: 100 },
          {
            extensions: [install({ name: "extra" })],
          },
        ),
      DocumentError,
    );
  } finally {
    operation.close();
  }
});
test("a second package-instance set is neither local installation nor a central authorization", async () => {
  const foreign = await import(new URL("../src/extensions.ts?foreign-s5a1", import.meta.url).href);
  const set = foreign.createExtensions([]);
  assert.throws(() => measure(node(), { width: 100 }, { adapters: set }), DocumentError);
  assert.throws(() => measure(node(), { width: 100 }, { extensions: [install(set)] }), DocumentError);
});
test("central inline and table adapters inherit through bound nested measurement without authorizing structural fakes", () => {
  let calls = 0;
  const badge = defineInlineAdapter({
    name: "test.central-inline",
    validate: (p) => p,
    measure: () => {
      calls++;
      return { advance: 4, ascent: 3, descent: 1, inkBounds: { empty: true }, nodes: [] };
    },
  });
  const adapters = createExtensions([badge, tableExtension]);
  const content = table({
    columns: [{ width: 50 }],
    body: [{ cells: [{ children: paragraph({ children: inline(badge, {}) }) }] }],
  });
  const options = textOptions({ extensions: [install(adapters)] });
  assert.ok(measure(content, { width: 100 }, options).size.height > 0);
  assert.ok(calls > 0);
  const wrapper = defineBlockAdapter({
    name: "test.central-table-wrapper",
    validate: (p) => p,
    measure(_props, context) {
      const report = context.measureContent(content, { width: context.width });
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: report.size,
        next: () => ({ end: 1, height: report.size.height, nodes: report.nodes }),
      };
    },
  });
  assert.ok(
    measure(extension(wrapper, {}), { width: 100 }, { ...options, adapters: createExtensions([wrapper]) }).size.height >
      0,
  );
  assert.throws(() => createExtensions([{ name: badge.name } as typeof badge]), DocumentError);
  assert.throws(
    () => measure(content, { width: 100 }, textOptions({ extensions: [install({ ...adapters })] })),
    DocumentError,
  );
});
