import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { type Component, createContext, h, useContext, type VDOMChild } from "@updf/core/vdom";
import { createPreparedFont } from "@updf/fonts";
import { fontInput } from "../../../tests/fixtures/fonts/font-fixture.js";
import { lower } from "../../../tests/fixtures/text-options.js";
import { richInput } from "../../../tests/fixtures/rich-input.js";

const document = (children: VDOMChild = []) =>
  h("document", {
    version: 1,
    children: h("page", {
      width: 100,
      height: 100,
      children,
    }),
  });
const textDocument = (children: VDOMChild) =>
  document(
    h("group", {
      x: 0,
      y: 0,
      children,
    }),
  );
function diagnostic(run: () => unknown, code: string, path?: string): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof DocumentError);
    assert.equal(error.diagnostics[0]?.code, code);
    if (path !== undefined) assert.equal(error.diagnostics[0]?.path, path);
    return true;
  });
}
function instrumented(first: VDOMChild) {
  const probes = { indices: 0, keys: 0 };
  const children = new Proxy([first, ...Array<VDOMChild>(999999).fill(null)], {
    getOwnPropertyDescriptor(target, key) {
      if (typeof key === "string" && /^\d+$/.test(key)) probes.indices++;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    ownKeys(target) {
      probes.keys++;
      return Reflect.ownKeys(target);
    },
  });
  return { children, probes };
}
test("F1: source limit stops sibling descriptor inspection before enumerating the tail", () => {
  const input = instrumented(document());
  diagnostic(() => lower(input.children, { profile: "service", limits: { nodes: 1 } }), "LIMIT", "/tree/0");
  assert.deepEqual(input.probes, { indices: 1, keys: 0 });
});
test("F1: text expansion also advances only one sibling before its source budget fails", () => {
  const Word: Component<object> = () => h("richText", { x: 0, y: 0, height: 12, ...richInput("word") });
  const input = instrumented(h(Word, {}));
  const Words: Component<object> = () => input.children;
  diagnostic(() => lower(textDocument(h(Words, {})), { profile: "service", limits: { nodes: 5 } }), "LIMIT");
  assert.deepEqual(input.probes, { indices: 1, keys: 0 });
});
test("F1: million-sibling source/text limit probes finish under a constrained child heap", () => {
  const source = `
    import assert from 'node:assert/strict';
    import { DocumentError } from '@updf/core';
    import { h, lower } from '@updf/core/vdom';
    const doc = (children = []) => h('document', { version: 1, children: h('page', { width: 100, height: 100, children }) });
    const check = (tree, nodes) => assert.throws(() => lower(tree, { profile: 'service', limits: { nodes } }),
      error => error instanceof DocumentError && error.diagnostics[0].code === 'LIMIT');
    const siblings = Array(1000000).fill(null);
    siblings[0] = doc();
    check(siblings, 1);
    siblings[0] = h(() => h('richText', {x:0,y:0,width:100,height:12,paragraphs:[]}), {});
    const words = h(() => siblings, {});
    check(doc(h('group', { x: 0, y: 0, children: words })), 5);
  `;
  execFileSync(process.execPath, ["--max-old-space-size=64", "--input-type=module", "--eval", source], {
    timeout: 15000,
  });
});
test("F1: incremental descriptor validation never invokes an accessor and still rejects extra array fields", () => {
  let calls = 0;
  const children: VDOMChild[] = [];
  Object.defineProperty(children, "0", {
    enumerable: true,
    get: () => {
      calls++;
      return document();
    },
  });
  diagnostic(() => lower(children), "TYPE", "/tree/0");
  assert.equal(calls, 0);
  const extra = Object.assign([document()], { extra: true });
  diagnostic(() => lower(extra), "TYPE", "/tree");
});
function providerLoop(text: boolean, changed: boolean): void {
  const context = createContext({ value: 0 });
  let calls = 0;
  const Loop: Component<object> = () => {
    useContext(context);
    if (++calls > 50) throw new Error("Guard reached instead of cycle rejection");
    return h(context.Provider, { value: { value: changed ? 1 : 0 }, children: h(Loop, {}) });
  };
  const tree = text ? textDocument(h(Loop, {})) : h(Loop, {});
  diagnostic(() => lower(tree), "VDOM_CYCLE");
  assert.equal(calls, changed ? 2 : 1);
}
test("F2: default-equivalent and recreated scoped providers cannot hide drawing/text cycles", () => {
  for (const text of [false, true]) for (const changed of [false, true]) providerLoop(text, changed);
});
test("F2: changing effective context data is legitimate progress in drawing and text", () => {
  for (const text of [false, true]) {
    const context = createContext(0);
    let calls = 0;
    const Finite: Component<object> = () => {
      calls++;
      const value = useContext(context);
      return value === 2
        ? text
          ? h("richText", { x: 0, y: 0, height: 12, ...richInput("done") })
          : document()
        : h(context.Provider, { value: value + 1, children: h(Finite, {}) });
    };
    assert.equal(lower(text ? textDocument(h(Finite, {})) : h(Finite, {})).pages.length, 1);
    assert.equal(calls, 3);
  }
});
test("F3: array/record and ordinary/null-prototype transitions are observable progress", () => {
  let calls = 0;
  const Finite: Component<{ value: unknown }> = ({ value }) => {
    calls++;
    if (Array.isArray(value)) return h(Finite, { value: {} });
    if (value && Object.getPrototypeOf(value) === Object.prototype) return h(Finite, { value: Object.create(null) });
    return document();
  };
  assert.equal(lower(h(Finite, { value: [] })).pages.length, 1);
  assert.equal(calls, 3);
});
test("F3: distinct owned font programs with identical metadata preserve props/context identity progress", async () => {
  const input = await fontInput();
  assert.ok(input.bytes instanceof Uint8Array);
  const bytes = new Uint8Array(input.bytes);
  bytes[0] = (bytes[0] ?? 0) ^ 1;
  const first = createPreparedFont(input);
  const second = createPreparedFont({ ...input, bytes });
  assert.deepEqual(first.metadata, second.metadata);
  let calls = 0;
  const Finite: Component<{ value: typeof first }> = ({ value }) => {
    calls++;
    return value === first ? h(Finite, { value: second }) : document();
  };
  assert.equal(lower(h(Finite, { value: first })).pages.length, 1);
  assert.equal(calls, 2);
  const context = createContext(first);
  const ContextFinite: Component<object> = () =>
    useContext(context) === first ? h(context.Provider, { value: second, children: h(ContextFinite, {}) }) : document();
  assert.equal(lower(h(ContextFinite, {})).pages.length, 1);
});
test("F3: signed-zero progress is distinct, while genuine same-data NaN recursion rejects", () => {
  const Finite: Component<{ value: number }> = ({ value }) =>
    Object.is(value, 0) ? h(Finite, { value: -0 }) : document();
  assert.equal(lower(h(Finite, { value: 0 })).pages.length, 1);
  let calls = 0;
  const Loop: Component<{ value: number }> = (props) => {
    if (++calls > 50) throw new Error("Guard reached");
    return h(Loop, props);
  };
  diagnostic(() => lower(h(Loop, { value: NaN })), "VDOM_CYCLE");
  assert.equal(calls, 1);
});
test("F3: ordered enumerable props keys are observable progress in drawing and text", () => {
  for (const text of [false, true]) {
    let calls = 0;
    const Finite: Component<{ a: number; b: number }> = (props) => {
      calls++;
      return Object.keys(props)[0] === "a"
        ? h(Finite, { b: 2, a: 1 })
        : text
          ? h("richText", { x: 0, y: 0, height: 12, ...richInput("done") })
          : document();
    };
    const node = h(Finite, { a: 1, b: 2 });
    assert.equal(lower(text ? textDocument(node) : node).pages.length, 1);
    assert.equal(calls, 2);
  }
});
test("F3: ordered provider keys differ from declaration defaults in drawing and text", () => {
  for (const text of [false, true]) {
    const context = createContext({ a: 1, b: 2 });
    let calls = 0;
    const Finite: Component<object> = () => {
      calls++;
      return Object.keys(useContext(context))[0] === "a"
        ? h(context.Provider, { value: { b: 2, a: 1 }, children: h(Finite, {}) })
        : text
          ? h("richText", { x: 0, y: 0, height: 12, ...richInput("done") })
          : document();
    };
    const node = h(Finite, {});
    assert.equal(lower(text ? textDocument(node) : node).pages.length, 1);
    assert.equal(calls, 2);
  }
});
test("F3: recreating props with the same ordered keys and values still rejects cycles", () => {
  for (const text of [false, true]) {
    let calls = 0;
    const Loop: Component<{ a: number; b: number }> = () => {
      if (++calls > 50) throw new Error("Guard reached instead of cycle rejection");
      return h(Loop, { a: 1, b: 2 });
    };
    const node = h(Loop, { a: 1, b: 2 });
    diagnostic(() => lower(text ? textDocument(node) : node), "VDOM_CYCLE");
    assert.equal(calls, 1);
  }
});
test("F3: recreating providers with the same ordered keys and values still rejects cycles", () => {
  for (const text of [false, true]) {
    const context = createContext({ a: 1, b: 2 });
    let calls = 0;
    const Loop: Component<object> = () => {
      useContext(context);
      if (++calls > 50) throw new Error("Guard reached instead of cycle rejection");
      return h(context.Provider, { value: { a: 1, b: 2 }, children: h(Loop, {}) });
    };
    const node = h(Loop, {});
    diagnostic(() => lower(text ? textDocument(node) : node), "VDOM_CYCLE");
    assert.equal(calls, 1);
  }
});
