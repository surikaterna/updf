/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { createContext, h, lower, useContext } from "@updf/core/vdom";
import {
  Block,
  Document,
  type DocumentProps,
  document,
  Flow,
  FragmentContext,
  flow,
  layout,
  Page,
  PageContext,
  type PageInfo,
  PageSize,
  Paragraph,
  page,
  pageSize,
} from "@updf/layout";

const Theme = createContext({ label: "report" });
function Footer() {
  const info: PageInfo = useContext(PageContext);
  const theme = useContext(Theme);
  return (
    <text
      x={0}
      y={0}
      width={180}
      height={12}
      fontSize={10}
      lineHeight={12}
      align="left"
    >{`${theme.label} ${info.docPageNumber}/${info.docPageCount}`}</text>
  );
}
function FragmentFooter() {
  const fragment = useContext(FragmentContext);
  return (
    <text
      x={0}
      y={0}
      width={180}
      height={12}
      fontSize={10}
      lineHeight={12}
      align="left"
    >{`${fragment.index}/${fragment.count}`}</text>
  );
}
const children = [
  <Page size={PageSize.A4}>
    <Footer />
  </Page>,
  <Flow pageSize={pageSize(200, 120)} margins={{ top: 10, right: 10, bottom: 10, left: 10 }}>
    <Flow.Body>
      <Block>
        <Block.Body>
          <Paragraph>Portable readonly sections</Paragraph>
        </Block.Body>
        <Block.Footer height={12}>
          <FragmentFooter />
        </Block.Footer>
      </Block>
    </Flow.Body>
    <Flow.Footer height={12}>
      <Footer />
    </Flow.Footer>
  </Flow>,
] as const;
const props: DocumentProps = { children };
const tree = (
  <Theme.Provider value={{ label: "nearest" }}>
    <Document {...props} />
  </Theme.Provider>
);
const result = layout(tree);
if (result.pageCount !== 2 || render(lower(tree)).length !== render(result.document).length)
  throw new Error("mixed parity");
const data = document({
  children: [
    page({ size: PageSize.A5 }),
    flow({ pageSize: PageSize.Letter, margins: { top: 10, right: 10, bottom: 10, left: 10 } }),
  ] as const,
});
if (layout(data).pageCount !== 2) throw new Error("explicit data");
if (layout(h(Document, props)).pageCount !== 2) throw new Error("typed h props");
if (result.pageCount < 0) {
  // @ts-expect-error Renderer-owned contexts cannot be overridden.
  const provider = PageContext.Provider;
  void provider;
  // @ts-expect-error Page has no native width/size ambiguity.
  const conflict = <Page size={PageSize.A4} width={200} />;
  void conflict;
  // @ts-expect-error PageSize presets are readonly.
  PageSize.A4.width = 1;
  // @ts-expect-error Final page context is deeply readonly.
  useContext(PageContext).flow.pageCount = 1;
}
