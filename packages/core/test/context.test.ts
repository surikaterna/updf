import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { type Component, createContext, Fragment, h, useContext, type VDOMChild } from "@updf/core/vdom";
import { fixtureFont } from "../../../tests/fixtures/fonts/font-fixture.js";
import { lower, render } from "../../../tests/fixtures/text-options.js";

const theme = createContext({ label: "default", nested: { color: [0, 0, 0] } });
const Label: Component<object> = () => useContext(theme).label;
const document = (children: VDOMChild) =>
  h("document", {
    version: 1,
    children: h("page", {
      width: 100,
      height: 100,
      children: h("text", {
        x: 0,
        y: 0,
        width: 100,
        height: 12,
        fontSize: 10,
        lineHeight: 12,
        align: "left",
        children,
      }),
    }),
  });
const label = () => h(Label, {});
const value = (label: string) => ({ label, nested: { color: [0, 0, 0] } });
const text = (tree: VDOMChild) => {
  const node = lower(tree).pages[0]?.children[0];
  assert.ok(node?.type === "text");
  return node.text;
};
test("context defaults and providers capture deeply frozen copies without freezing callers", () => {
  const original = value("original");
  const context = createContext(original);
  original.label = "changed";
  original.nested.color[0] = 1;
  const Read: Component<object> = () => {
    const captured = useContext(context);
    assert.ok(Object.isFrozen(captured.nested.color));
    assert.equal(captured.nested.color[0], 0);
    return captured.label;
  };
  assert.equal(text(document(h(Read, {}))), "original");
  const providerValue = value("captured");
  const tree = h(theme.Provider, { value: providerValue, children: document(label()) });
  providerValue.label = "mutated";
  assert.equal(text(tree), "captured");
  assert.equal(Object.isFrozen(providerValue), false);
});
test("provider nesting restores siblings, text children and separate lowering operations", () => {
  const nested = h(theme.Provider, { value: value("inner"), children: label() });
  const tree = h(theme.Provider, { value: value("outer"), children: document([label(), nested, label()]) });
  assert.equal(text(tree), "outerinnerouter");
  assert.equal(text(document(label())), "default");
  assert.deepEqual(render(lower(tree)), render(lower(tree)));
});
test("reentrant lower calls isolate defaults and restore outer frame on success and throw", () => {
  const Read: Component<object> = () => {
    assert.equal(useContext(theme).label, "outer");
    assert.equal(text(document(label())), "default");
    const Throw: Component<object> = () => {
      throw new Error("nested failure");
    };
    assert.throws(() => lower(h(Throw, {})), DocumentError);
    return useContext(theme).label;
  };
  const tree = h(theme.Provider, { value: value("outer"), children: document(h(Read, {})) });
  assert.equal(text(tree), "outer");
  assert.throws(() => useContext(theme), DocumentError);
});
test("context ownership rejects executable/accessor/cyclic/binary/node/class/symbol data without getters", () => {
  let calls = 0;
  const accessor = {
    get value() {
      calls++;
      return 1;
    },
  };
  const cycle: { self?: unknown } = {};
  cycle.self = cycle;
  for (const input of [
    accessor,
    cycle,
    () => 1,
    Symbol(),
    { [Symbol()]: 1 },
    new Uint8Array(1),
    new ArrayBuffer(1),
    new Date(),
    h(Fragment, {}),
  ])
    assert.throws(() => createContext(input), DocumentError);
  assert.throws(() => h(theme.Provider, { value: accessor as unknown as ReturnType<typeof value> }), DocumentError);
  assert.equal(calls, 0);
});
test("forged contexts, direct providers and hooks outside expansion fail structurally", () => {
  assert.throws(() => useContext(theme), DocumentError);
  const forged = { Provider: theme.Provider };
  const Read: Component<object> = () => {
    useContext(forged);
    return null;
  };
  assert.throws(() => lower(h(Read, {})), DocumentError);
  assert.equal(text(document(label())), "default");
});
test("async output and thenable accessors reject without invocation and do not leak frames", () => {
  let calls = 0;
  const Bad: Component<object> = () =>
    ({
      // biome-ignore lint/suspicious/noThenProperty: Adversarial thenable must never be assimilated.
      get then() {
        calls++;
        throw new Error("getter");
      },
    }) as unknown as VDOMChild;
  const Async = (() => Promise.resolve(null)) as unknown as Component<object>;
  for (const component of [Bad, Async]) assert.throws(() => lower(h(component, {})), DocumentError);
  assert.equal(calls, 0);
  assert.throws(() => useContext(theme), DocumentError);
  assert.equal(text(document(label())), "default");
});
test("contexts preserve privately owned handles; copied metadata is data, not a resource", async () => {
  const font = await fixtureFont();
  const context = createContext({ font });
  const Read: Component<object> = () => {
    assert.equal(useContext(context).font, font);
    return "owned";
  };
  assert.equal(text(document(h(Read, {}))), "owned");
  const copy = { ...font };
  assert.ok(createContext({ font: copy }));
  assert.throws(() => render({ version: 1, pages: [] }, { resources: { Demo: copy } }), DocumentError);
});
