import { compileSVG, prepareSVG, type SVGCompilation, type SVGDiagnostic } from "@updf/svg";
import {
  compilePreparedSVG,
  prepareSVGTree,
  type PreparedSVGCompilation,
  type SVGPreparationDiagnostic,
} from "@updf/svg/authoring";
import { jsx } from "@updf/svg/jsx-runtime";

const source = '<svg viewBox="0 0 10 10"><rect width="2" height="3" style="stroke:&apos;none&apos;"/></svg>';
const target = { x: 0, y: 0, w: 10, h: 10 };
export const inferredSlices = compileSVG(source, target).diagnostics.map((w) => source.slice(w.span.start, w.span.end));
const annotated: SVGCompilation = compileSVG(source, target);
export const annotatedSlices = annotated.diagnostics.map((w) => source.slice(w.span.start, w.span.end));
export function xmlSlice(warning: SVGDiagnostic): string {
  return source.slice(warning.span.start, warning.span.end);
}

const graphic = prepareSVGTree(jsx("svg", { viewBox: "0 0 10 10", style: "stroke:'none'" }));
const prepared: PreparedSVGCompilation = compilePreparedSVG(graphic, target);
export const optionalSpans = prepared.diagnostics.map((w) => w.span?.start);
export const xmlPreparedSpans = compilePreparedSVG(prepareSVG(source), target).diagnostics.map((w) => w.span?.start);
export const spanless: SVGPreparationDiagnostic = {
  code: "SVG_STYLE",
  severity: "warning",
  path: "/svg/@style",
  message: "Review discarded declaration",
};

export function failures(): void {
  // @ts-expect-error Legacy XML diagnostics must have source spans.
  const xmlWarning: SVGDiagnostic = spanless;
  // @ts-expect-error A shared prepared compilation is not necessarily from XML.
  const xmlCompilation: SVGCompilation = prepared;
  graphic.diagnostics.map((w) => {
    // @ts-expect-error Structured handle warnings have no guaranteed XML span.
    return w.span.start;
  });
  compilePreparedSVG(graphic, target).diagnostics.map((w) => {
    // @ts-expect-error Inferred prepared warnings remain span-optional.
    return w.span.end;
  });
  prepared.diagnostics.map((w) => {
    // @ts-expect-error Explicit prepared compilation warnings remain span-optional.
    return w.span.start;
  });
  void [xmlWarning, xmlCompilation];
}
