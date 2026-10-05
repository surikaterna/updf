/** @jsxImportSource @updf/core */

import { createContext, useContext } from "@updf/core/vdom";
import { Block, Document, Flow, type Orientation, PageContext, PageSize, Paragraph, pt } from "@updf/layout";
import { FixedAppendix, FixedCover } from "./fixed-pages.js";
import { layout } from "./layout-options.js";
import { render } from "./text-options.js";

export interface MixedControls {
  readonly count: number;
  readonly preset: keyof typeof PageSize;
  readonly orientation: Orientation;
  readonly theme: "ocean" | "amber";
  readonly header: boolean;
  readonly footer: boolean;
}
// Application-defined theme: a provider is not implicit CSS inheritance.
const Theme = createContext({ background: [0.892, 0.916, 0.94] as readonly [number, number, number] });
const defaults: MixedControls = {
  count: 12,
  preset: "A5",
  orientation: "portrait",
  theme: "ocean",
  header: true,
  footer: true,
};
export function ReportFooter() {
  const page = useContext(PageContext);
  const theme = useContext(Theme);
  return (
    <Block style={{ backgroundColor: theme.background }}>
      <Paragraph style={{ fontSize: 10, lineHeight: 1.4 }}>
        {`Page ${page.docPageNumber}/${page.docPageCount}`}
      </Paragraph>
    </Block>
  );
}
export function mixedExample(title: string, controls: MixedControls = defaults) {
  if (!Number.isInteger(controls.count) || controls.count < 1 || controls.count > 40)
    throw new Error("Paragraph count must be 1–40");
  const size = PageSize[controls.preset];
  if (
    !size ||
    !["portrait", "landscape"].includes(controls.orientation) ||
    !["ocean", "amber"].includes(controls.theme)
  )
    throw new Error("Unknown mixed-document controls");
  const background = controls.theme === "ocean" ? ([0.892, 0.916, 0.94] as const) : ([0.952, 0.916, 0.886] as const);
  const fixed = { size, orientation: controls.orientation, footer: controls.footer, background };
  const tree = (
    <Theme.Provider value={{ background }}>
      <Document>
        <FixedCover {...fixed} title={`${title}: fixed cover`} />
        <Flow pageSize={size} orientation={controls.orientation} margins={{ top: 36, right: 36, bottom: 36, left: 36 }}>
          {controls.header && (
            <Flow.Header height={24}>
              <Paragraph style={{ fontSize: 10, lineHeight: 1.4 }}>{`${title}: flowing report`}</Paragraph>
            </Flow.Header>
          )}
          <Flow.Body>
            {Array.from({ length: controls.count }, (_, index) => (
              <Paragraph style={{ fontSize: 11, lineHeight: pt(15) }}>
                {`Section paragraph ${index + 1}. ${"Measured prose stays in its own flow section; fixed pages never donate unused space. ".repeat(8)}`}
              </Paragraph>
            ))}
          </Flow.Body>
          {controls.footer && (
            <Flow.Footer height={14}>
              <ReportFooter />
            </Flow.Footer>
          )}
        </Flow>
        <FixedAppendix {...fixed} title={`${title}: fixed appendix`} />
      </Document>
    </Theme.Provider>
  );
  const result = layout(tree);
  return { bytes: render(result.document), pageCount: result.pageCount };
}
