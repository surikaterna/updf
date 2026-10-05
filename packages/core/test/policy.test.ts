import assert from "node:assert/strict";
import test from "node:test";
import { type DocumentDefinition, DocumentError, type NodeDefinition, renderUnknown, SERVICE_LIMITS } from "@updf/core";
import { type Component, lower as coreLower, createContext, h, useContext } from "@updf/core/vdom";
import { createPreparedFont } from "@updf/fonts";
import { measureTextUnknown } from "@updf/text";
import { fontDocument, fontInput, fontText } from "../../../tests/fixtures/fonts/font-fixture.js";
import { lower, measureText, render } from "../../../tests/fixtures/text-options.js";

const rectangle: NodeDefinition = { type: "rect", x: 5, y: 5, width: 1, height: 1 };
const page = { width: 1000000, height: 100, children: [] as readonly NodeDefinition[] };
const document = (children: readonly NodeDefinition[] = []): DocumentDefinition => ({
  version: 1,
  pages: [{ ...page, children }],
});
const plain = (text: string) =>
  ({ kind: "plain", width: page.width, text, fontSize: 1, lineHeight: 2, align: "left" }) as const;
const text = (content: string): NodeDefinition => ({
  type: "text",
  x: 0,
  y: 0,
  height: 2,
  width: page.width,
  text: content,
  fontSize: 1,
  lineHeight: 2,
  align: "left",
});
function limited(run: () => unknown): void {
  assert.throws(run, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT");
}
test("trusted defaults exceed old pages/per-node/aggregate text and node ceilings", () => {
  assert.ok(render({ version: 1, pages: Array.from({ length: 21 }, () => page) }).length);
  assert.equal(measureText(plain(" ".repeat(4097))).lineCount, 1);
  assert.ok(render(document([text(" ".repeat(100001))])).length);
  assert.ok(render(document(Array.from({ length: 10001 }, () => rectangle))).length);
  limited(() => render({ version: 1, pages: Array.from({ length: 21 }, () => page) }, { profile: "service" }));
  limited(() => render(document([text(" ".repeat(100001))]), { profile: "service" }));
});
test("service defaults are frozen; overrides permit zero and raise individual limits", () => {
  assert.ok(Object.isFrozen(SERVICE_LIMITS));
  assert.ok(
    render(document(), { profile: "service", limits: { nodes: 0, textCodePoints: 0, resourceBytes: 0 }, resources: {} })
      .length,
  );
  limited(() => render(document([rectangle]), { limits: { nodes: 0 } }));
  limited(() => render(document(), { limits: { pages: 0 } }));
  assert.ok(
    render({ version: 1, pages: Array.from({ length: 21 }, () => page) }, { profile: "service", limits: { pages: 21 } })
      .length,
  );
});
test("options reject unknown keys, undefined, unsafe integers, fractions, infinity and accessors before body", () => {
  let calls = 0;
  const options = {
    get profile() {
      calls++;
      return "service";
    },
  };
  const invalid: unknown[] = [
    options,
    { extra: true },
    { profile: undefined },
    { profile: "unknown" },
    { limits: undefined },
    { resources: undefined },
    { limits: { extra: 0 } },
  ];
  for (const value of [undefined, -1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])
    invalid.push({ limits: { pages: value } });
  for (const options of invalid) {
    assert.throws(() => renderUnknown(null, options as never), DocumentError);
    assert.throws(() => measureTextUnknown(null, options as never), DocumentError);
    assert.throws(() => coreLower(null, options as never), DocumentError);
  }
  assert.equal(calls, 0);
});
test("exact and plus-one node/page/text/path/output budgets enforce independent units", () => {
  assert.ok(render(document([rectangle]), { limits: { nodes: 1, pathCommands: 5 } }).length);
  limited(() => render(document([rectangle, rectangle]), { limits: { nodes: 1 } }));
  limited(() => render(document([rectangle, rectangle]), { limits: { pathCommands: 9 } }));
  assert.equal(measureText(plain("AB"), { limits: { textCodePoints: 2 } }).lineCount, 1);
  limited(() => measureText(plain("ABC"), { limits: { textCodePoints: 2 } }));
  const bytes = render(document());
  assert.deepEqual(render(document(), { limits: { outputBytes: bytes.length } }), bytes);
  limited(() => render(document(), { limits: { outputBytes: bytes.length - 1 } }));
  limited(() => render(document(), { limits: { outputBytes: 0 } }));
});
test("supplementary text charges one scalar before mandatory font profile rejection", () => {
  limited(() => measureText(plain("😀"), { limits: { textCodePoints: 0 } }));
  assert.throws(
    () => measureText(plain("😀"), { limits: { textCodePoints: 1 } }),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "CHARACTER",
  );
});
test("measurement uses the same optional source depth policy before glyph/line allocation", () => {
  assert.equal(measureText(plain("A"), { limits: { depth: 0 } }).lineCount, 1);
  limited(() => measureText({ kind: "rich", width: 10, paragraphs: [] }, { limits: { depth: 0 } }));
});
test("trusted rich lines exceed JavaScript argument-spread sizes without implicit ceilings", () => {
  const input = {
    kind: "rich",
    width: page.width,
    paragraphs: [
      {
        defaultStyle: { font: "Helvetica", fontSize: 1, color: [0, 0, 0] },
        runs: [{ text: "A".repeat(130000) }],
        lineHeight: 2,
        align: "left",
        whiteSpace: "preserve",
        breakLongWords: "error",
      },
    ],
  } as const;
  const result = measureText(input);
  assert.equal(result.lineCount, 1);
  assert.equal(result.lines[0]?.fragments[0]?.text.length, 130000);
  limited(() => measureText(input, { profile: "service" }));
});
test("trusted sibling traversal exceeds JavaScript call arity without a hidden VDOM array cap", () => {
  const node = h("rect", { x: 5, y: 5, width: 1, height: 1 });
  const tree = h("document", {
    version: 1,
    children: h("page", {
      width: 100,
      height: 100,
      children: Array.from({ length: 130000 }, () => node),
    }),
  });
  assert.equal(lower(tree).pages[0]?.children.length, 130000);
  limited(() => lower(tree, { profile: "service" }));
});
test("trusted typed paths can exceed the old per-path ceiling; aggregate limits remain optional", () => {
  const path: NodeDefinition = {
    type: "path",
    commands: [
      { type: "move", x: 1, y: 1 },
      ...Array.from({ length: 4096 }, () => ({ type: "line" as const, x: 2, y: 2 })),
    ],
  };
  assert.ok(render(document([path])).length);
  limited(() => render(document([path]), { limits: { pathCommands: 4096 } }));
});
test("trusted deep native/VDOM/context snapshots do not depend on recursive JavaScript traversal", () => {
  let node: NodeDefinition = rectangle;
  for (let i = 0; i < 1500; i++) node = { type: "paintGroup", children: [node] };
  assert.ok(render(document([node])).length);
  limited(() => render(document([node]), { profile: "service" }));
  let child = h("rect", { x: 1, y: 1, width: 1, height: 1 });
  for (let i = 0; i < 1500; i++) child = h("group", { children: child });
  const tree = h("document", { version: 1, children: h("page", { width: 100, height: 100, children: child }) });
  assert.ok(render(lower(tree)).length);
  limited(() => lower(tree, { profile: "service" }));
  let value: unknown = "leaf";
  for (let i = 0; i < 1500; i++) value = { nested: value };
  const context = createContext(value);
  const Read: Component<object> = () => {
    assert.ok(useContext(context));
    return tree;
  };
  assert.ok(lower(h(Read, {})));
});
test("resource byte limits count font aliases once, apply before copies, and trusted PDF can exceed 10 MiB", async () => {
  const input = await fontInput();
  const font = createPreparedFont({ ...input, bytes: new Uint8Array(11 * 1024 * 1024) });
  const resources = { Demo: font, Alias: font };
  assert.ok(render(fontDocument([fontText("A")]), { resources }).length > 10 * 1024 * 1024);
  limited(() => render(fontDocument([]), { resources, profile: "service" }));
  assert.ok(render(fontDocument([]), { resources, limits: { resourceBytes: font.metadata.byteLength } }).length);
  limited(() => render(fontDocument([]), { resources, limits: { resourceBytes: font.metadata.byteLength - 1 } }));
});
test("nested operations isolate policies and snapshot caller limits before component mutation", () => {
  const limits = { pages: 1 };
  const Read: Component<object> = () => {
    limits.pages = 0;
    limited(() => render(document(), { limits: { pages: 0 } }));
    return h("document", { version: 1, children: h("page", { width: 100, height: 100, children: [] }) });
  };
  assert.equal(lower(h(Read, {}), { limits }).pages.length, 1);
  limited(() => lower(h(Read, {}), { limits }));
});
