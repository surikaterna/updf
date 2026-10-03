import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { createContext, h, lower, useContext } from "@updf/core/vdom";
import { Block, createExtensions, Document, Flow, layout, layoutFlow, Paragraph } from "@updf/layout";
import { Table, table, tableExtension } from "@updf/tables";

const columns = [{ width: 180 }] as const;
const extensions = createExtensions([tableExtension]);
const pageTemplate = { width: 200, height: 160, margins: { top: 5, right: 5, bottom: 5, left: 5 } };
async function extract(bytes: Uint8Array): Promise<string> {
  const directory = await mkdtemp("/tmp/opencode/updf-mixed-emissions-");
  try {
    const path = `${directory}/output.pdf`;
    await writeFile(path, bytes);
    execFileSync("qpdf", ["--check", path]);
    return execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
function documentRoot(content: import("@updf/layout").BlockContent) {
  return h(Document, {
    children: h(Flow, {
      pageSize: { width: 200, height: 160 },
      margins: pageTemplate.margins,
      extensions,
      children: content,
    }),
  });
}
test("F-AUD01 R2 static nested head/foot recipes survive the opposite deferred section through all entry paths", async () => {
  for (const edge of ["head", "foot"] as const) {
    let calls = 0;
    function Region({ side }: { readonly side: string }) {
      calls++;
      return h(Paragraph, { children: `${edge}_${side}` });
    }
    const nested = h(Block, {
      children: [
        h(Block.Header, { height: 20, children: h(Region, { side: "INNER_HEAD" }) }),
        h(Paragraph, { children: `${edge}_BODY` }),
        h(Block.Footer, { height: 20, children: h(Region, { side: "INNER_FOOT" }) }),
      ],
    });
    const head =
      edge === "head"
        ? { rows: [{ cells: [{ children: nested }] }] }
        : { height: 20, rows: [{ cells: [{ children: "OUTER_HEAD" }] }] };
    const foot =
      edge === "foot"
        ? { rows: [{ cells: [{ children: nested }] }] }
        : { height: 20, rows: [{ cells: [{ children: "OUTER_FOOT" }] }] };
    for (const mixed of [false, true]) {
      const input = table({
        columns,
        ...(mixed || edge === "head" ? { head } : {}),
        ...(mixed || edge === "foot" ? { foot } : {}),
        body: [{ cells: [{ children: "BODY" }] }],
      });
      for (const bytes of [
        render(layoutFlow({ pageTemplate, body: [input] }, {}, extensions).document),
        render(layout(documentRoot(input)).document),
        render(lower(documentRoot(input))),
      ]) {
        const text = await extract(bytes);
        assert.match(text, new RegExp(`${edge}_INNER_HEAD[\\s\\S]*${edge}_BODY[\\s\\S]*${edge}_INNER_FOOT`, "u"));
        assert.equal(text.includes(edge === "head" ? "OUTER_FOOT" : "OUTER_HEAD"), mixed);
      }
      assert.equal(calls, mixed ? 12 : 6);
    }
  }
});
test("F-AUD01 R2 JSX section mixing extracts nested authored text rather than merely matching wrong bytes", async () => {
  let calls = 0;
  function Header() {
    calls++;
    return h(Paragraph, { children: "INNER_HEAD" });
  }
  const nested = h(Block, {
    children: [h(Block.Header, { height: 20, children: h(Header, {}) }), h(Paragraph, { children: "HEAD_BODY" })],
  });
  const content = h(Table, {
    columns,
    children: [
      h(Table.Head, { children: h(Table.Row, { children: h(Table.HeaderCell, { children: nested }) }) }),
      h(Table.Body, { children: h(Table.Row, { children: h(Table.Cell, { children: "BODY" }) }) }),
      h(Table.Foot, { height: 20, children: h(Table.Row, { children: h(Table.Cell, { children: "FOOT" }) }) }),
    ],
  });
  const root = documentRoot(content);
  const data = render(layout(root).document),
    jsx = render(lower(root));
  assert.equal(calls, 2);
  assert.deepEqual(data, jsx);
  assert.match(await extract(data), /INNER_HEAD[\s\S]*HEAD_BODY[\s\S]*BODY[\s\S]*FOOT/u);
});
test("F-AUD04 static head/foot copies failing only on the second cached table identify body 1 and retain span", () => {
  for (const edge of ["head", "foot"] as const) {
    let calls = 0;
    function Region() {
      return h(Paragraph, { children: ++calls === 2 ? "Ж" : "OK" });
    }
    const nested = h(Block, {
      children: [h(Block.Header, { height: 20, children: h(Region, {}) }), h(Paragraph, { children: "STATIC" })],
    });
    const shared = table({
      columns,
      [edge]: { rows: [{ cells: [{ children: nested }] }] },
      body: [{ cells: [{ children: "ROW" }] }],
    });
    assert.throws(
      () => layoutFlow({ pageTemplate, body: [shared, shared] }, {}, extensions),
      (error: unknown) => {
        if (!(error instanceof DocumentError)) return false;
        const diagnostic = error.diagnostics[0];
        assert.equal(diagnostic?.code, "CHARACTER");
        assert.ok(diagnostic?.path.startsWith(`/body/1/props/${edge}/rows/0/cells/0/`), diagnostic?.path);
        assert.deepEqual(diagnostic?.span, { start: 0, end: 1 });
        return true;
      },
    );
    assert.equal(calls, 2);
  }
});
test("F-AUD01 R2 exact text quota includes fixed-transport deferred emissions: six passes, five fails", () => {
  const inner = h(Block, {
    children: [
      h(Block.Header, { height: 12, children: h(Paragraph, { children: "I" }) }),
      h(Paragraph, { children: "H" }),
      h(Block.Footer, { height: 12, children: h(Paragraph, { children: "J" }) }),
    ],
  });
  const input = table({
    columns,
    head: { rows: [{ cells: [{ children: inner }] }] },
    body: [{ cells: [{ children: "B" }] }],
    foot: { height: 20, rows: [{ cells: [{ children: "FX" }] }] },
  });
  assert.ok(
    render(
      layoutFlow({ pageTemplate, body: [input] }, { profile: "service", limits: { textCodePoints: 6 } }, extensions)
        .document,
    ).length,
  );
  assert.throws(
    () =>
      layoutFlow({ pageTemplate, body: [input] }, { profile: "service", limits: { textCodePoints: 5 } }, extensions),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
  );
});
function assertNestedOrigin(edge: "head" | "foot") {
  const Theme = createContext({ text: "DEFAULT" });
  const observed: string[] = [];
  function Region() {
    const text = useContext(Theme).text;
    observed.push(text);
    return h(Paragraph, { children: text });
  }
  const nested = h(Block, {
    children: [h(Block.Header, { height: 20, children: h(Region, {}) }), h(Paragraph, { children: "STATIC" })],
  });
  const shared = table({
    columns,
    [edge]: { rows: [{ cells: [{ children: nested }] }] },
    body: [{ cells: [{ children: "BODY" }] }],
    [edge === "head" ? "foot" : "head"]: { height: 20, rows: [{ cells: [{ children: "OPPOSITE" }] }] },
  });
  const section = h(Flow, {
    pageSize: { width: 200, height: 160 },
    margins: pageTemplate.margins,
    extensions,
    children: shared,
  });
  const content = h(Document, {
    children: [
      h(Theme.Provider, { value: { text: "OK" }, children: section }),
      h(Theme.Provider, { value: { text: "Ж" }, children: section }),
    ],
  });
  assert.throws(
    () => layout(content),
    (error: unknown) => {
      if (!(error instanceof DocumentError)) return false;
      assert.equal(error.diagnostics[0]?.code, "CHARACTER");
      assert.ok(
        error.diagnostics[0]?.path.startsWith(`/document/children/1/provider/body/0/props/${edge}/rows/0/cells/0/`),
        error.diagnostics[0]?.path,
      );
      assert.deepEqual(error.diagnostics[0]?.span, { start: 0, end: 1 });
      return true;
    },
  );
  assert.deepEqual(observed, ["OK", "Ж"]);
}
test("F-AUD04 nested static recipes across flow/provider occurrences retain current-source diagnostics", () => {
  for (const edge of ["head", "foot"] as const) assertNestedOrigin(edge);
});
