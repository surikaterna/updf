import { render } from "@updf/core";
import type { PreparedFont } from "@updf/core/fonts";
import { createContext, h, lower, useContext } from "@updf/core/vdom";
import {
  Block,
  Document,
  Flow,
  FragmentContext,
  type FragmentInfo,
  layout,
  Page,
  PageContext,
  type PageInfo,
  Paragraph,
  pageSize,
} from "@updf/layout";

const Theme = createContext({ name: "default" });
export function mixedProof(font: PreparedFont) {
  const pages: { page: PageInfo; theme: string }[] = [];
  const fragments: { page: number; fragment: FragmentInfo }[] = [];
  function Footer() {
    const info = useContext(PageContext);
    pages.push({ page: info, theme: useContext(Theme).name });
    return h(Paragraph, {
      style: { font: "Proof", fontSize: 10, lineHeight: 1.2 },
      children: `Page ${info.docPageNumber}/${info.docPageCount}`,
    });
  }
  function FragmentLabel() {
    fragments.push({ page: useContext(PageContext).docPageNumber, fragment: useContext(FragmentContext) });
    return h(Paragraph, { children: "Fragment", style: { lineHeight: 1.2 } });
  }
  const footer = h(Flow.Footer, { height: 12, children: h(Footer, {}) });
  const body = proofBody(FragmentLabel);
  const tree = h(Document, {
    children: [
      h(Page, { size: pageSize(200, 120) }),
      section("one", [h(Flow.Body, { children: body }), footer]),
      h(Page, { size: pageSize(220, 130) }),
      section("two", [footer]),
    ],
  });
  const options = { resources: { Proof: font } };
  const result = layout(tree, options);
  const native = render(result.document, options);
  const info = {
    pages: pages.slice(),
    fragments: fragments.slice(),
    pageCount: result.pageCount,
    placements: result.placements,
  };
  const bytes = render(lower(tree, options), options);
  if (native.length !== bytes.length || native.some((byte, index) => byte !== bytes[index]))
    throw new Error("Mixed lower/layout parity failed");
  return { ...info, bytes: Array.from(bytes) };
}
function proofBody(FragmentLabel: () => import("@updf/core/vdom").VDOMChild) {
  return h(Block, {
    children: [
      h(Block.Header, { height: 12, repeat: true, children: h(FragmentLabel, {}) }),
      h(Block.Body, {
        children: Array.from({ length: 5 }, () =>
          h(Paragraph, {
            style: { font: "Proof", fontSize: 10, lineHeight: { unit: "pt", value: 28 } },
            children: "Привет",
          }),
        ),
      }),
      h(Block.Footer, { height: 12, children: h(FragmentLabel, {}) }),
    ],
  });
}
function section(name: string, children: readonly import("@updf/core/vdom").VNode[]) {
  return h(Theme.Provider, {
    value: { name },
    children: h(Flow, {
      pageSize: pageSize(200, 110),
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
      children,
    }),
  });
}
export function mountMixedProof(font: PreparedFont): void {
  const result = document.createElement("pre");
  result.id = "mixed-proof";
  result.hidden = true;
  result.textContent = JSON.stringify(mixedProof(font));
  document.body.append(result);
}
