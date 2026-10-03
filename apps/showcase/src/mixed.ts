import { render } from "@updf/core";
import { createContext, h, lower, useContext } from "@updf/core/vdom";
import { Document, Flow, type Orientation, Page, PageContext, PageSize, Paragraph } from "@updf/layout";

export interface MixedControls {
  readonly count: number;
  readonly preset: keyof typeof PageSize;
  readonly orientation: Orientation;
  readonly theme: "ocean" | "amber";
  readonly header: boolean;
  readonly footer: boolean;
}
const Theme = createContext({ color: [0.1, 0.3, 0.5] as readonly [number, number, number] });
const defaults: MixedControls = {
  count: 12,
  preset: "A5",
  orientation: "portrait",
  theme: "ocean",
  header: true,
  footer: true,
};
function text(text: string, width: number, height = 14) {
  return h("text", { x: 0, y: 0, width, height, text, fontSize: 10, lineHeight: 14, align: "left" });
}
export function ReportFooter(props: { readonly width: number }) {
  const page = useContext(PageContext);
  const theme = useContext(Theme);
  return h("paintGroup", {
    children: [
      h("rect", {
        x: 0,
        y: 0,
        width: props.width,
        height: 14,
        paint: { fill: theme.color, stroke: null, fillOpacity: 0.12 },
      }),
      text(`Page ${page.docPageNumber}/${page.docPageCount}`, props.width),
    ],
  });
}
function fixedPage(title: string, size: { readonly width: number; readonly height: number }, footer: boolean) {
  const width = size.width - 72;
  return h(Page, {
    size,
    children: [
      h("group", { x: 36, y: 36, children: text(title, width, 28) }),
      ...(footer ? [h("group", { x: 36, y: size.height - 50, children: h(ReportFooter, { width }) })] : []),
    ],
  });
}
export function mixedExample(title: string, controls: MixedControls = defaults) {
  if (!Number.isInteger(controls.count) || controls.count < 1 || controls.count > 40)
    throw new Error("Paragraph count must be 1–40");
  const preset = PageSize[controls.preset];
  if (
    !preset ||
    !["portrait", "landscape"].includes(controls.orientation) ||
    !["ocean", "amber"].includes(controls.theme)
  )
    throw new Error("Unknown mixed-document controls");
  const width =
    controls.orientation === "landscape"
      ? Math.max(preset.width, preset.height)
      : Math.min(preset.width, preset.height);
  const height =
    controls.orientation === "landscape"
      ? Math.min(preset.width, preset.height)
      : Math.max(preset.width, preset.height);
  const size = { width, height },
    bodyWidth = width - 72;
  const body = paragraphs(controls.count);
  const tree = h(Theme.Provider, {
    value: { color: controls.theme === "ocean" ? ([0.1, 0.3, 0.5] as const) : ([0.6, 0.3, 0.05] as const) },
    children: h(Document, {
      children: [
        fixedPage(`${title}: fixed cover`, size, controls.footer),
        reportFlow(title, controls, bodyWidth, body),
        fixedPage(`${title}: fixed appendix`, size, controls.footer),
      ],
    }),
  });
  const document = lower(tree);
  return { bytes: render(document), pageCount: document.pages.length };
}
function paragraphs(count: number) {
  return Array.from({ length: count }, (_, index) =>
    h(Paragraph, {
      defaultStyle: { fontSize: 11 },
      lineHeight: 15,
      children: `Section paragraph ${index + 1}. ${"Measured prose stays in its own flow section; fixed pages never donate unused space. ".repeat(8)}`,
    }),
  );
}
function reportFlow(title: string, controls: MixedControls, bodyWidth: number, body: ReturnType<typeof paragraphs>) {
  return h(Flow, {
    pageSize: PageSize[controls.preset],
    orientation: controls.orientation,
    margins: { top: 36, right: 36, bottom: 36, left: 36 },
    children: [
      ...(controls.header
        ? [h(Flow.Header, { height: 24, children: text(`${title}: flowing report`, bodyWidth) })]
        : []),
      h(Flow.Body, { children: body }),
      ...(controls.footer ? [h(Flow.Footer, { height: 14, children: h(ReportFooter, { width: bodyWidth }) })] : []),
    ],
  });
}
