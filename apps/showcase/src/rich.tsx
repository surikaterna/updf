/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import type { ParagraphDefinition } from "@updf/core/measurement";
import { createContext, lower, useContext } from "@updf/core/vdom";
import { createExtensions, measure, Paragraph, Span } from "@updf/layout";
import { Document } from "@updf/layout/vdom";
import { badge, badgeAdapter } from "./inline-badge.js";

const Theme = createContext({ accent: [0.75, 0.12, 0.08] as const, body: [0.08, 0.2, 0.65] as const });
function ThemedText(props: { readonly title: string; readonly controls: RichControls }) {
  const theme = useContext(Theme);
  const controls = props.controls;
  return (
    <Paragraph
      defaultStyle={{ fontSize: controls.fontSize }}
      lineHeight={controls.fontSize * 1.5}
      align={controls.align}
      whiteSpace={controls.whiteSpace}
      breakLongWords={controls.breakLongWords}
    >
      <Span style={{ fontSize: controls.fontSize * 1.2, color: theme.accent }}>{`  ${props.title}`}</Span>
      <Span style={{ color: theme.body }}>
        {"  styled text across span boundaries.\nSpaces  and hard breaks stay explicit.  "}
      </Span>
      {badge(controls.fontSize)}
      {" Native inline badge."}
    </Paragraph>
  );
}

export interface RichControls {
  readonly width: number;
  readonly fontSize: number;
  readonly align: ParagraphDefinition["align"];
  readonly whiteSpace: ParagraphDefinition["whiteSpace"];
  readonly breakLongWords: ParagraphDefinition["breakLongWords"];
}
export const richDefaults: RichControls = {
  width: 280,
  fontSize: 14,
  align: "left",
  whiteSpace: "preserve",
  breakLongWords: "error",
};
export function richExample(title: string, controls: RichControls = richDefaults) {
  if (!Number.isFinite(controls.width) || controls.width < 20 || controls.width > 500)
    throw new Error("Rich width must be 20..500 points");
  if (!Number.isFinite(controls.fontSize) || controls.fontSize < 8 || controls.fontSize > 32)
    throw new Error("Rich font size must be 8..32 points");
  const extensions = createExtensions([badgeAdapter]);
  const content = (
    <Theme.Provider value={{ accent: [0.75, 0.12, 0.08], body: [0.08, 0.2, 0.65] }}>
      <ThemedText title={title} controls={controls} />
    </Theme.Provider>
  );
  const measurement = measure(content, { width: controls.width }, { extensions });
  const tree = (
    <Document
      extensions={extensions}
      pageTemplate={{ width: controls.width + 80, height: 842, margins: { top: 40, right: 40, bottom: 40, left: 40 } }}
    >
      {content}
    </Document>
  );
  const bytes = render(lower(tree));
  return { bytes, measurement, policy: "trusted; optional service limits; context theme (no page context)" };
}
export function richDemo(title: string): Uint8Array {
  return richExample(title).bytes;
}
