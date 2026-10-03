import assert from "node:assert/strict";
import { test } from "node:test";
import { DocumentError, render } from "@updf/core";
import { createLayoutOperation } from "@updf/core/internal";
import { createContext, definePrimitive, h, lower, useContext, type VDOMChild } from "@updf/core/vdom";
import {
  Block,
  Document,
  document,
  Flow,
  FragmentContext,
  type FragmentInfo,
  flow,
  flowFooter,
  layout,
  Page,
  PageContext,
  type PageInfo,
  PageSize,
  Paragraph,
  page,
  pageSize,
} from "@updf/layout";

const margins = { top: 10, right: 10, bottom: 10, left: 10 };
function nativeText(text: string, width = 180) {
  return h("text", { x: 0, y: 0, width, height: 12, text, fontSize: 10, lineHeight: 12, align: "left" });
}
test("mixed sections retain order, empty-flow page, sizes and exact lower/layout bytes", () => {
  const content = h(Document, {
    children: [
      h(Page, { size: PageSize.A5, children: nativeText("Cover") }),
      h(Flow, { pageSize: pageSize(200, 100), margins, children: h(Paragraph, { children: "Body" }) }),
      h(Page, { size: pageSize(150, 200), orientation: "landscape" as const, children: nativeText("Appendix", 150) }),
      h(Flow, { pageSize: PageSize.Letter, margins, children: [] }),
    ],
  });
  const measured = layout(content);
  assert.equal(measured.pageCount, 4);
  assert.deepEqual(
    measured.document.pages.map(({ width, height }) => [width, height]),
    [
      [PageSize.A5.width, PageSize.A5.height],
      [200, 100],
      [200, 150],
      [612, 792],
    ],
  );
  assert.deepEqual(render(lower(content)), render(measured.document));
});
test("final callbacks receive document-local counts and captured nearest provider once per page", () => {
  const Theme = createContext({ name: "default" });
  const seen: { info: PageInfo; theme: string }[] = [];
  function ReportFooter() {
    const info = useContext(PageContext);
    seen.push({ info, theme: useContext(Theme).name });
    return nativeText(`Page ${info.docPageNumber}/${info.docPageCount}`);
  }
  const footer = h(Flow.Footer, { height: 15, children: h(ReportFooter, {}) });
  const tree = h(Document, {
    children: [
      h(Page, { size: pageSize(200, 100), children: h(ReportFooter, {}) }),
      h(Theme.Provider, {
        value: { name: "one" },
        children: h(Flow, {
          pageSize: pageSize(200, 100),
          margins,
          children: [h(Flow.Body, { children: [{ type: "pageBreak" as const }] }), footer],
        }),
      }),
      h(Theme.Provider, {
        value: { name: "two" },
        children: h(Flow, { pageSize: pageSize(200, 100), margins, children: [footer] }),
      }),
    ],
  });
  assert.equal(layout(tree).pageCount, 4);
  assert.deepEqual(
    seen.map(({ info, theme }) => [
      info.docPageNumber,
      info.docPageCount,
      info.sectionNumber,
      info.flow?.index ?? null,
      info.flow?.pageNumber ?? null,
      theme,
    ]),
    [
      [1, 4, 1, null, null, "default"],
      [2, 4, 2, 0, 1, "one"],
      [3, 4, 2, 0, 2, "one"],
      [4, 4, 3, 1, 1, "two"],
    ],
  );
});
test("final-only contexts and whole-document page quota reject before final callbacks", () => {
  let calls = 0;
  function Footer() {
    calls++;
    return nativeText("footer");
  }
  function Early() {
    useContext(PageContext);
    return h(Paragraph, { children: "early" });
  }
  assert.throws(
    () => layout(h(Document, { children: h(Flow, { pageSize: pageSize(200, 100), margins, children: h(Early, {}) }) })),
    /unavailable before finalization/,
  );
  const fixed = h(Page, { size: pageSize(200, 100), children: h(Footer, {}) });
  assert.throws(
    () =>
      layout(h(Document, { children: [fixed, h(Flow, { pageSize: pageSize(200, 100), margins }), fixed] }), {
        profile: "service",
        limits: { pages: 2 },
      }),
    /Document pages/,
  );
  assert.equal(calls, 0);
  assert.equal("Provider" in PageContext, false);
  assert.throws(() => useContext(PageContext), /requires component execution/);
});
test("the public read handle cannot forge the hidden renderer binding even through the internal operation seam", () => {
  const operation = createLayoutOperation({});
  let calls = 0;
  try {
    const forged = PageContext as unknown as Parameters<typeof operation.finalContext>[0];
    assert.throws(
      () =>
        operation.finalContext(forged, {}, () => {
          calls++;
        }),
      /Expected renderer-owned binding/,
    );
    assert.equal(calls, 0);
  } finally {
    operation.close();
  }
});
test("layout and ordinary lower share the existing operation-local native primitive registry and metadata", () => {
  let calls = 0;
  const stamp = definePrimitive<Record<never, never>>(
    "PageStamp",
    (_props: unknown): _props is Record<never, never> => typeof _props === "object" && _props !== null,
    (_props, context) => {
      calls++;
      assert.deepEqual(context.resources, [{ id: "Other", kind: "test" }]);
      return nativeText(`Page ${useContext(PageContext).docPageNumber}`);
    },
  );
  const tree = h(Document, { children: h(Page, { size: pageSize(200, 100), children: h(stamp.Type, {}) }) });
  const options = { registry: [stamp.definition], resourceMetadata: [{ id: "Other", kind: "test" }] };
  const result = layout(tree, options);
  assert.equal(calls, 1);
  assert.deepEqual(render(result.document), render(lower(tree, options)));
  assert.equal(calls, 2);
  assert.throws(() => layout(tree), /not installed/);
});
test("readonly explicit document data and invalid hierarchy", () => {
  assert.equal(
    layout(document({ children: [page({ size: PageSize.A4 }), flow({ pageSize: PageSize.A5, margins })] })).pageCount,
    2,
  );
  assert.throws(() => layout(h(Document, { children: h(Paragraph, { children: "bare" }) })), /Page or Flow/);
  assert.throws(() => layout(document({ children: [] })), /requires at least one page/);
  assert.throws(
    () =>
      layout(
        h(Document, {
          children: h(Flow, { pageSize: PageSize.A4, margins, children: h(Page, { size: PageSize.A4 }) }),
        }),
      ),
    /Inline content/,
  );
});
test("pure readonly native data pages and regions need neither JSX nor VNodes", () => {
  const children = [
    {
      type: "text" as const,
      x: 0,
      y: 0,
      width: 180,
      height: 12,
      text: "Pure data",
      fontSize: 10,
      lineHeight: 12,
      align: "left" as const,
    },
  ] as const;
  const content = document({
    children: [
      page({ size: pageSize(200, 100), children }),
      flow({ pageSize: pageSize(200, 100), margins, children: [flowFooter({ height: 12, children })] }),
    ],
  });
  const result = layout(content);
  assert.equal(result.pageCount, 2);
  assert.equal(result.document.pages[0]?.children[0]?.type, "text");
  assert.ok(render(result.document).length > 0);
  assert.throws(
    () => page({ size: PageSize.A4, orientation: undefined } as unknown as Parameters<typeof page>[0]),
    /Omit undefined/,
  );
});
test("fixed Page rejects nested semantic Document/Flow before descendant callbacks", () => {
  let calls = 0;
  function Descendant() {
    calls++;
    return nativeText("unexpected");
  }
  const nested = h(Document, { children: h(Page, { size: PageSize.A4, children: h(Descendant, {}) }) });
  for (const children of [nested, h(Flow, { pageSize: PageSize.A4, margins, children: h(Descendant, {}) })]) {
    assert.throws(
      () => layout(h(Document, { children: h(Page, { size: PageSize.A4, children }) })),
      /fixed Page drawing tree/,
    );
  }
  assert.equal(calls, 0);
});
test("generic Block slots resolve owner-local total fragments after body fragmentation", () => {
  const seen: { owner: string; page: number; fragment: FragmentInfo }[] = [];
  function Decoration(props: { readonly owner: string }) {
    seen.push({
      owner: props.owner,
      page: useContext(PageContext).docPageNumber,
      fragment: useContext(FragmentContext),
    });
    return nativeText(props.owner, 180);
  }
  const fragmenting = (owner: string, count: number) =>
    h(Block, {
      children: [
        h(Block.Header, { height: 12, repeat: true, children: h(Decoration, { owner }) }),
        h(Block.Body, { children: Array.from({ length: count }, () => ({ type: "spacer" as const, height: 30 })) }),
        h(Block.Footer, { height: 12, children: h(Decoration, { owner: `${owner}-last` }) }),
      ],
    });
  const tree = h(Document, {
    children: h(Flow, {
      pageSize: pageSize(200, 140),
      margins,
      children: [fragmenting("a", 5), fragmenting("b", 1), fragmenting("c", 1)],
    }),
  });
  const result = layout(tree);
  assert.ok(result.pageCount >= 2);
  const a = seen.filter(({ owner }) => owner === "a");
  assert.ok(a.length >= 2);
  assert.deepEqual(
    a.map(({ fragment }) => [fragment.index, fragment.count, fragment.first, fragment.last]),
    a.map((_, index) => [index, a.length, index === 0, index === a.length - 1]),
  );
  for (const owner of ["a", "b", "c"]) {
    const last = seen.find((entry) => entry.owner === `${owner}-last`);
    assert.equal(last?.fragment.last, true);
    assert.equal(last?.fragment.index, (last?.fragment.count ?? 0) - 1);
  }
  assert.equal(seen.find(({ owner }) => owner === "b")?.page, seen.find(({ owner }) => owner === "c")?.page);
  assert.equal("Provider" in FragmentContext, false);
  assert.deepEqual(render(lower(tree)), render(result.document));
});
test("late wrapping overflow never repaginates or retries callback and closes hooks on failure", () => {
  let calls = 0;
  function Footer() {
    calls++;
    useContext(PageContext);
    return nativeText("word ".repeat(30));
  }
  const tree = h(Document, {
    children: h(Flow, {
      pageSize: pageSize(200, 100),
      margins,
      children: h(Flow.Footer, { height: 12, children: h(Footer, {}) }),
    }),
  });
  assert.throws(() => layout(tree), /overflow|height|fit/i);
  assert.equal(calls, 1);
  assert.throws(() => useContext(PageContext), /requires component execution/);
  assert.equal(layout(document({ children: page({ size: PageSize.A4 }) })).pageCount, 1);
});
test("double-digit page counts are final before any callbacks, nested renders stay independent", () => {
  const seen: string[] = [];
  function Footer() {
    const info = useContext(PageContext);
    const independent = layout(document({ children: page({ size: PageSize.A5 }) }));
    assert.equal(independent.pageCount, 1);
    assert.equal(useContext(PageContext).docPageCount, 12);
    seen.push(`${info.docPageNumber}/${info.docPageCount}`);
    return nativeText(`Page ${info.docPageNumber}/${info.docPageCount}`);
  }
  const tree = h(Document, {
    children: h(Flow, {
      pageSize: pageSize(200, 100),
      margins,
      children: [
        h(Flow.Body, { children: Array.from({ length: 11 }, () => ({ type: "pageBreak" as const })) }),
        h(Flow.Footer, { height: 12, children: h(Footer, {}) }),
      ],
    }),
  });
  assert.equal(layout(tree).pageCount, 12);
  assert.deepEqual(
    seen,
    Array.from({ length: 12 }, (_, index) => `${index + 1}/12`),
  );
});
test("late semantic regions wrap within the required reservation or explicitly clip a constrained Block", () => {
  let calls = 0;
  function Footer() {
    calls++;
    const info = useContext(PageContext);
    return h(Paragraph, { children: `Page ${info.docPageNumber}/${info.docPageCount}` });
  }
  const content = (children: VDOMChild, height: number) =>
    h(Document, {
      children: h(Flow, { pageSize: pageSize(200, 100), margins, children: h(Flow.Footer, { height, children }) }),
    });
  assert.equal(layout(content(h(Footer, {}), 12)).pageCount, 1);
  assert.equal(calls, 1);
  function LongFooter() {
    calls++;
    useContext(PageContext);
    return h(Paragraph, { children: "word ".repeat(30) });
  }
  assert.throws(
    () => layout(content(h(LongFooter, {}), 12)),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "VERTICAL_OVERFLOW",
  );
  assert.equal(calls, 2);
  const hidden = h(Block, { style: { height: 12, overflow: "hidden" as const }, children: h(LongFooter, {}) });
  assert.equal(layout(content(hidden, 12)).pageCount, 1);
  assert.equal(calls, 3);
});
test("late Promise output and thrown message getters reject without getters or leaked frames", () => {
  let getters = 0;
  function Async(): VDOMChild {
    useContext(PageContext);
    return Promise.resolve(null) as unknown as VDOMChild;
  }
  function Throw(): VDOMChild {
    const error = new Error("failure");
    Object.defineProperty(error, "message", {
      get() {
        getters++;
        return "getter";
      },
    });
    throw error;
  }
  for (const component of [Async, Throw]) {
    assert.throws(
      () => layout(h(Document, { children: h(Page, { size: PageSize.A4, children: h(component, {}) }) })),
      DocumentError,
    );
    assert.throws(() => useContext(PageContext), /requires component execution/);
  }
  assert.equal(getters, 0);
  function Structured(): VDOMChild {
    throw new DocumentError("VALUE", "/local", "Original structured failure", { span: { start: 2, end: 5 } });
  }
  assert.throws(
    () => layout(h(Document, { children: h(Page, { size: PageSize.A4, children: h(Structured, {}) }) })),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "VALUE" &&
      error.diagnostics[0].path.endsWith("/local") &&
      error.diagnostics[0].span?.start === 2,
  );
});
