import type { BlockControls } from "./blocks.js";
import type { FlowControls } from "./flow.js";
import type { MixedControls } from "./mixed.js";
import { paintingDemo } from "./painting.js";
import paintingSource from "./painting.ts?raw";
import type { RichControls } from "./rich.js";
import richSource from "./rich.tsx?raw";
import type { TableControls } from "./tables.js";
import templateSource from "./template.tsx?raw";
import { textDemo } from "./text.js";
import textSource from "./text.ts?raw";

export const demos = {
  text: { source: textSource, render: textDemo },
  template: { source: templateSource },
  painting: { source: paintingSource, render: paintingDemo },
  rich: { source: richSource },
};

export type DemoId =
  | keyof typeof demos
  | "svg"
  | "flow"
  | "tables"
  | "blocks"
  | "mixed"
  | "rows"
  | "rows-overflow"
  | "invoice";

export function demoId(value: string): DemoId {
  if (
    value === "invoice" ||
    value === "text" ||
    value === "template" ||
    value === "painting" ||
    value === "svg" ||
    value === "rich" ||
    value === "flow" ||
    value === "blocks" ||
    value === "mixed" ||
    value === "rows" ||
    value === "rows-overflow" ||
    value === "tables"
  )
    return value;
  throw new Error("Unknown predefined example");
}

export async function generate(
  id: DemoId,
  title: string,
  controls?: RichControls,
  flow?: FlowControls,
  tables?: TableControls,
  blocks?: BlockControls,
  mixed?: MixedControls,
): Promise<{ bytes: Uint8Array; source: string; summary?: string }> {
  if (title.length > 40) throw new Error("Title must be at most 40 characters");
  if (id === "invoice") return invoiceResult(title);
  if (id === "template") return templateResult(title);
  if (id === "mixed") return mixedResult(title, mixed);
  if (id === "blocks") return blockResult(title, blocks);
  if (id === "rows" || id === "rows-overflow") return rowResult(title, id === "rows-overflow");
  if (id === "tables") {
    const { tableExample, source } = await import("./optional-tables.js");
    const visual = tables?.cellPreset === "svg" ? (await import("./optional-table-svg.js")).tableVisual : undefined;
    const { bytes, result } = tableExample(title, tables, visual);
    return {
      bytes,
      source,
      summary: `${result.pageCount} pages; ${result.consumedBodyRowCount} body rows; ${result.repeatedHeaderCount} repeated headers.`,
    };
  }
  if (id === "flow") {
    const { flowExample, source } = await import("./optional-flow.js");
    const result = flowExample(title, flow);
    return {
      bytes: result.bytes,
      source,
      summary: `${result.result.pageCount} pages; ${result.authoredParagraphCount} authored paragraphs; ${result.result.placements.length} fragments.`,
    };
  }
  if (id === "rich") {
    const { richExample } = await import("./rich.js");
    const result = richExample(title, controls);
    return {
      bytes: result.bytes,
      source: richSource,
      summary: `${result.measurement.lines.length} lines, ${result.measurement.size.height} points consumed height. Policy: ${result.policy}.`,
    };
  }
  if (id === "svg") {
    const { svgDemo, source } = await import("./optional.js");
    return { bytes: svgDemo(title), source };
  }
  return { bytes: demos[id].render(title), source: demos[id].source };
}
async function templateResult(title: string) {
  const { templateDemo } = await import("./template.js");
  return { bytes: templateDemo(title), source: templateSource };
}
async function invoiceResult(title: string) {
  const { invoiceExample, source } = await import("./optional-invoice.js");
  const { bytes, metadata } = invoiceExample(title);
  return {
    bytes,
    source,
    summary: `${metadata.pageCount} A4 pages; ${metadata.itemCount} original mock line items; integer-cent application totals. NOT FOR PAYMENT.`,
  };
}
async function rowResult(title: string, oversized: boolean) {
  const { rowExample, source } = await import("./optional-rows.js");
  const { bytes, result } = rowExample(title, oversized);
  return {
    bytes,
    source,
    summary: `${result.pageCount} pages; atomic fixed/weighted nested rows; top/middle/bottom/stretch; explicit clip (not redaction).`,
  };
}
async function mixedResult(title: string, controls?: MixedControls) {
  const { mixedExample, source } = await import("./optional-mixed.js");
  const result = mixedExample(title, controls);
  return {
    bytes: result.bytes,
    source,
    summary: `${result.pageCount} pages; fixed cover, measured flow, fixed appendix; final document-local page counts.`,
  };
}
async function blockResult(title: string, controls?: BlockControls) {
  const { blockExample, source } = await import("./optional-blocks.js");
  const { bytes, result, authoredBodyBlockCount } = blockExample(title, controls);
  return {
    bytes,
    source,
    summary: `${result.pageCount} pages; ${authoredBodyBlockCount} authored body blocks; ${result.placements.length} fragments. Overflow: ${controls?.hidden ? "hidden (not redaction)" : "error"}.`,
  };
}
