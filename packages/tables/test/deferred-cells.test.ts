import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { createContext, h, lower, useContext } from "@updf/core/vdom";
import {
  Block,
  createExtensions,
  Document,
  defineBlockAdapter,
  extension,
  Flow,
  FragmentContext,
  layout,
  layoutFlow,
  Page,
  PageContext,
  Paragraph,
} from "@updf/layout";
import { table, tableExtension } from "@updf/tables";

const extensions = createExtensions([tableExtension]);
const columns = [{ width: 180 }] as const;
const pageTemplate = { width: 200, height: 110, margins: { top: 5, right: 5, bottom: 5, left: 5 } };
async function extracted(bytes: Uint8Array): Promise<string> {
  const directory = await mkdtemp("/tmp/opencode/updf-deferred-cell-");
  try {
    const path = `${directory}/output.pdf`;
    await writeFile(path, bytes);
    execFileSync("qpdf", ["--check", path]);
    return execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
test("F-AUD01 authored Block head/body/foot survive public cell measurement and actual PDF extraction", async () => {
  let calls = 0;
  function Header() {
    calls++;
    return h(Paragraph, { children: "CELL_HEADER" });
  }
  const content = h(Block, {
    children: [
      h(Block.Header, { height: 20, children: h(Header, {}) }),
      h(Paragraph, { children: "CELL_BODY" }),
      h(Block.Footer, { height: 20, children: h(Paragraph, { children: "CELL_FOOTER" }) }),
    ],
  });
  const input = table({ columns, body: [{ cells: [{ children: content }] }] });
  const result = layoutFlow({ pageTemplate, body: [input] }, {}, extensions);
  assert.equal(calls, 1);
  const text = await extracted(render(result.document));
  assert.match(text, /CELL_HEADER[\s\S]*CELL_BODY[\s\S]*CELL_FOOTER/u);
});
test("F-AUD01 measured nested cell blocks finalize on the placed page with their own fragment/provider context", async () => {
  const Theme = createContext({ name: "DEFAULT" });
  const seen: string[] = [];
  function Region({ edge }: { readonly edge: string }) {
    const page = useContext(PageContext),
      fragment = useContext(FragmentContext),
      theme = useContext(Theme);
    const text = `${theme.name}_${edge}_P${page.docPageNumber}/${page.docPageCount}_F${fragment.index}/${fragment.count}`;
    seen.push(text);
    return h(Paragraph, { children: text, defaultStyle: { fontSize: 8 }, lineHeight: 10 });
  }
  const cell = h(Block, {
    children: [
      h(Block.Header, { height: 20, children: h(Region, { edge: "HEAD" }) }),
      h(Paragraph, { children: "BODY" }),
      h(Block.Footer, { height: 20, children: h(Region, { edge: "FOOT" }) }),
    ],
  });
  const data = table({ columns, body: [{ cells: [{ children: cell }] }, { cells: [{ children: cell }] }] });
  const flow = h(Flow, {
    pageSize: { width: 200, height: 110 },
    margins: pageTemplate.margins,
    extensions,
    children: data,
  });
  const content = h(Document, {
    children: [
      h(Page, { size: { width: 200, height: 110 } }),
      h(Theme.Provider, { value: { name: "CAPTURED" }, children: flow }),
      h(Page, { size: { width: 200, height: 110 } }),
    ],
  });
  const result = layout(content);
  assert.equal(result.pageCount, 4);
  assert.deepEqual(seen, [
    "CAPTURED_HEAD_P2/4_F0/1",
    "CAPTURED_FOOT_P2/4_F0/1",
    "CAPTURED_HEAD_P3/4_F0/1",
    "CAPTURED_FOOT_P3/4_F0/1",
  ]);
  const text = await extracted(render(result.document));
  for (const expected of seen) assert.ok(text.includes(expected));
  seen.length = 0;
  assert.deepEqual(render(lower(content)), render(result.document));
  assert.equal(seen.length, 4);
});
test("F-AUD02 cached semantic tables have independent first/last/count owners for every occurrence", async () => {
  const contexts: string[] = [];
  function Header() {
    const fragment = useContext(FragmentContext);
    const value = `${fragment.index}/${fragment.count}/${fragment.first}/${fragment.last}`;
    contexts.push(value);
    return h(Paragraph, { children: value, defaultStyle: { fontSize: 8 }, lineHeight: 10 });
  }
  const shared = table({
    columns,
    head: { height: 20, repeat: true, rows: [{ cells: [{ children: h(Header, {}) }] }] },
    body: [{ cells: [{ children: "ROW" }] }],
  });
  const result = layoutFlow({ pageTemplate, body: [shared, shared] }, {}, extensions);
  assert.deepEqual(contexts, ["0/1/true/true", "0/1/true/true"]);
  assert.deepEqual(
    result.placements.map((placement) => placement.sourceIndex),
    [0, 1],
  );
  const text = await extracted(render(result.document));
  assert.equal(text.match(/0\/1\/true\/true/gu)?.length, 2);
});
test("F-AUD01 clipping retains deferred authored text, while page limits prevent callback previews", async () => {
  let calls = 0;
  function Header() {
    calls++;
    return h(Paragraph, { children: "CLIPPED_HEADER" });
  }
  const content = h(Block, {
    children: [
      h(Block.Header, { height: 20, children: h(Header, {}) }),
      h(Paragraph, { children: "VISIBLE_BODY" }),
      h(Block.Footer, { height: 20, children: h(Paragraph, { children: "CLIPPED_FOOTER" }) }),
    ],
  });
  const input = table({
    columns,
    body: [{ cells: [{ children: content, style: { height: 30, overflow: "hidden" } }] }],
  });
  assert.throws(
    () => layoutFlow({ pageTemplate, body: [input] }, { profile: "service", limits: { pages: 0 } }, extensions),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
  );
  assert.equal(calls, 0);
  const result = layoutFlow({ pageTemplate, body: [input] }, {}, extensions);
  const text = await extracted(render(result.document));
  assert.match(text, /CLIPPED_HEADER[\s\S]*VISIBLE_BODY[\s\S]*CLIPPED_FOOTER/u);
  assert.equal(calls, 1);
});
test("F-AUD02 reused multi-fragment table owners reset per source occurrence without losing reuse", () => {
  const seen: string[] = [];
  function Header() {
    const value = useContext(FragmentContext);
    seen.push(`${value.index}/${value.count}/${value.first}/${value.last}`);
    return h(Paragraph, { children: "TABLE_HEAD" });
  }
  const shared = table({
    columns,
    head: { height: 20, repeat: true, rows: [{ cells: [{ children: h(Header, {}) }] }] },
    body: Array.from({ length: 6 }, () => ({ cells: [{ children: "ROW" }] })),
  });
  const result = layoutFlow({ pageTemplate, body: [shared, shared] }, {}, extensions);
  assert.equal(result.pageCount, 4);
  assert.deepEqual(seen, ["0/2/true/false", "1/2/false/true", "0/3/true/false", "1/3/false/false", "2/3/false/true"]);
});
test("F-AUD02 late diagnostics use the current cached occurrence and preserve caller errors/spans", () => {
  let calls = 0;
  function Header() {
    return h(Paragraph, { children: ++calls === 2 ? "Ж" : "OK" });
  }
  const shared = table({
    columns,
    head: { height: 20, repeat: true, rows: [{ cells: [{ children: h(Header, {}) }] }] },
    body: [{ cells: [{ children: "ROW" }] }],
  });
  assert.throws(
    () => layoutFlow({ pageTemplate, body: [shared, shared] }, {}, extensions),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "CHARACTER" &&
      error.diagnostics[0]?.path.startsWith("/body/1/") === true &&
      error.diagnostics[0]?.span !== undefined,
  );
  const original = new DocumentError("TYPE", "/caller", "Caller supplied diagnostic", { span: { start: 3, end: 5 } });
  const broken = defineBlockAdapter({
    name: "audit.original-error",
    validate: (input) => input,
    measure() {
      throw original;
    },
  });
  const failed = table({
    columns,
    head: { height: 20, rows: [{ cells: [{ children: extension(broken, {}) }] }] },
    body: [],
  });
  assert.throws(
    () => layoutFlow({ pageTemplate, body: [failed] }, {}, createExtensions([tableExtension, broken])),
    (error: unknown) => error === original,
  );
});
test("F-AUD01 static table head cells preserve nested Block recipes on every repeated copy", async () => {
  const seen: number[] = [];
  function InnerHeader() {
    const value = useContext(FragmentContext);
    assert.deepEqual(value, { index: 0, count: 1, first: true, last: true });
    seen.push(useContext(PageContext).docPageNumber);
    return h(Paragraph, { children: "NESTED_STATIC_HEAD" });
  }
  const head = h(Block, {
    children: [h(Block.Header, { height: 20, children: h(InnerHeader, {}) }), h(Paragraph, { children: "HEAD_BODY" })],
  });
  const input = table({
    columns,
    head: { repeat: true, rows: [{ cells: [{ children: head }] }] },
    body: Array.from({ length: 4 }, () => ({ cells: [{ children: "BODY_ROW" }], minHeight: 40 })),
  });
  const result = layoutFlow({ pageTemplate, body: [input] }, {}, extensions);
  assert.equal(seen.length, result.pageCount);
  const text = await extracted(render(result.document));
  assert.equal(text.match(/NESTED_STATIC_HEAD/gu)?.length, result.pageCount);
});
test("F-AUD01 deferred hidden text still enforces whole-document policy without footer previews", () => {
  let heads = 0,
    feet = 0;
  function Header() {
    heads++;
    return h(Paragraph, { children: "HEADER_TEXT" });
  }
  function Footer() {
    feet++;
    return h(Paragraph, { children: "FOOTER_TEXT" });
  }
  const content = h(Block, {
    children: [
      h(Block.Header, { height: 20, children: h(Header, {}) }),
      h(Paragraph, { children: "BODY" }),
      h(Block.Footer, { height: 20, children: h(Footer, {}) }),
    ],
  });
  const input = table({
    columns,
    body: [{ cells: [{ children: content, style: { height: 30, overflow: "hidden" } }] }],
  });
  assert.throws(
    () =>
      layoutFlow({ pageTemplate, body: [input] }, { profile: "service", limits: { textCodePoints: 8 } }, extensions),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
  );
  assert.equal(heads, 1);
  assert.equal(feet, 0);
});
