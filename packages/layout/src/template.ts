import type { Box } from "@updf/core";
import { array, fail, type LayoutOperation, number, validateDataObject as record, sum } from "@updf/core/internal";
import { type DerivedAxis, derivedAxis } from "./axis.js";
import type { PageRegion, PageTemplate } from "./types.js";

export interface TemplateGeometry {
  readonly template: PageTemplate;
  readonly body: Box;
  readonly horizontal: DerivedAxis;
  readonly vertical: DerivedAxis;
  readonly footerY: number;
  readonly regionWork: readonly [number, number];
}
function region(value: unknown, path: string): asserts value is PageRegion {
  record(value, ["height", "children"], path);
  number(value.height, `${path}/height`, true);
  array(value.children, Number.MAX_SAFE_INTEGER, `${path}/children`);
}
function geometry(template: PageTemplate): Omit<TemplateGeometry, "regionWork"> {
  const { margins, header, footer } = template;
  const headerGap = header ? (template.headerBodyGap ?? 0) : 0;
  const footerGap = footer ? (template.bodyFooterGap ?? 0) : 0;
  const horizontal = derivedAxis(margins.left, sum([template.width, -margins.right]), "/pageTemplate/width");
  const vertical = derivedAxis(
    sum([margins.top, header?.height ?? 0, headerGap]),
    sum([template.height, -margins.bottom, -(footer?.height ?? 0), -footerGap]),
    "/pageTemplate/height",
  );
  const footerY = sum([template.height, -margins.bottom, -(footer?.height ?? 0)]);
  if (
    (header && margins.top + header.height > vertical.start) ||
    footerY < vertical.end ||
    (footer && footerY + footer.height > sum([template.height, -margins.bottom]))
  )
    fail("GEOMETRY", "/pageTemplate/height", "Materialized repeated regions overlap their reserved boundaries.");
  return {
    template,
    horizontal,
    vertical,
    footerY,
    body: { x: horizontal.start, y: vertical.start, width: horizontal.capacity, height: vertical.capacity },
  };
}
export function template(value: unknown, operation: LayoutOperation): TemplateGeometry {
  const path = "/pageTemplate";
  record(value, ["width", "height", "margins", "header", "footer", "headerBodyGap", "bodyFooterGap"], path);
  number(value.width, `${path}/width`, true);
  number(value.height, `${path}/height`, true);
  record(value.margins, ["top", "right", "bottom", "left"], `${path}/margins`);
  for (const key of ["top", "right", "bottom", "left"]) number(value.margins[key], `${path}/margins/${key}`);
  if ("header" in value) region(value.header, `${path}/header`);
  if ("footer" in value) region(value.footer, `${path}/footer`);
  if ("headerBodyGap" in value) number(value.headerBodyGap, `${path}/headerBodyGap`);
  if ("bodyFooterGap" in value) number(value.bodyFooterGap, `${path}/bodyFooterGap`);
  const result = geometry(value as unknown as PageTemplate);
  const { header, footer } = result.template;
  const headerWork = header
    ? operation.validateFixed(header.children, result.body.width, header.height, `${path}/header`)
    : 0;
  const footerWork = footer
    ? operation.validateFixed(footer.children, result.body.width, footer.height, `${path}/footer`)
    : 0;
  return { ...result, regionWork: [headerWork, footerWork] };
}
