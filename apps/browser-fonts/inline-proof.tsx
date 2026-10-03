/** @jsxImportSource @updf/core */
import { type PreparedFont, render } from "@updf/core";
import { createContext, lower, useContext } from "@updf/core/vdom";
import { createExtensions, measure, Paragraph, Span } from "@updf/layout";
import { Document } from "@updf/layout/vdom";
import { badge, badgeAdapter } from "../showcase/src/inline-badge.js";
import { inlineSVG, inlineSVGAdapter } from "../showcase/src/optional-inline-svg.js";

const Theme = createContext({ color: [0, 0, 1] as const });
const svg = '<svg viewBox="0 0 16 16"><path d="M0 0H16V16H0Z" fill="#ff0000"/></svg>';
function Content() {
  return (
    <Paragraph defaultStyle={{ font: "Demo", fontSize: 12 }} whiteSpace="collapse">
      <Span style={{ color: useContext(Theme).color }}>{"Привет  "}</Span>
      {badge(24)}
      <Span style={{ font: "Helvetica", color: [0, 0, 0] }}>{" portable "}</Span>
      {inlineSVG(svg, 16, 16)}
      {" А\u00a0Б"}
    </Paragraph>
  );
}
export function inlineProof(font: PreparedFont) {
  const extensions = createExtensions([badgeAdapter, inlineSVGAdapter]);
  const options = { resources: { Demo: font }, profile: "service" as const };
  const content = (
    <Theme.Provider value={{ color: [0, 0, 1] }}>
      <Content />
    </Theme.Provider>
  );
  const measurement = measure(content, { width: 250 }, { ...options, extensions });
  const document = lower(
    <Document
      extensions={extensions}
      pageTemplate={{ width: 290, height: 150, margins: { top: 20, right: 20, bottom: 20, left: 20 } }}
    >
      {content}
    </Document>,
    options,
  );
  return { measurement, bytes: render(document, options), document };
}
export function mountInlineProof(font: PreparedFont): void {
  const proof = inlineProof(font);
  const url = URL.createObjectURL(new Blob([proof.bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "inline-browser.pdf";
  link.textContent = "Download inline paragraph proof";
  const result = document.createElement("pre");
  result.id = "inline-measurement";
  result.textContent = JSON.stringify(proof.measurement);
  document.body.append(link, result);
  window.addEventListener("pagehide", () => URL.revokeObjectURL(url), { once: true });
}
