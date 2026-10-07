import type { DemoId } from "./demos.js";

interface Metadata {
  title: string;
  purpose: string;
  badges: string[];
  files: string;
}

function entry(title: string, purpose: string, badges: string[], files: string): Metadata {
  return { title, purpose, badges, files };
}

const freightFiles =
  "examples/business: freight-invoice.tsx · freight-invoice-sections.tsx · freight-invoice-calculations.ts · freight-invoice-data.ts · freight-invoice-fonts.ts; scripts/freight-invoice-example.ts; apps/showcase/src/optional-freight-invoice.ts; tests/fixtures/fonts/FREIGHT.md";

export const metadata: Record<DemoId, Metadata> = {
  text: entry(
    "Positioned text",
    "A minimal document with explicit coordinates and built-in Helvetica.",
    ["Core", "Fixed page"],
    "text.ts",
  ),
  template: entry(
    "Reusable components",
    "Compose typed TSX components into a measured, reusable document.",
    ["Native TSX", "Layout · lazy"],
    "template.tsx",
  ),
  rich: entry(
    "Rich text & measurement",
    "Explore line wrapping, alignment and whitespace with shared measurement.",
    ["Native TSX", "Measured text"],
    "rich.tsx",
  ),
  flow: entry(
    "Measured flow",
    "Let paragraphs paginate naturally, with repeated headers and footers.",
    ["Layout · lazy", "Pagination"],
    "flow.tsx",
  ),
  mixed: entry(
    "Mixed document",
    "Combine a fixed cover, flowing content and an appendix with final page counts.",
    ["Layout · lazy", "Composition"],
    "mixed.tsx · fixed-pages.tsx",
  ),
  tables: entry(
    "Paged inventory table",
    "Tune row counts, repeated headers and mixed cell content in a real paged table.",
    ["Tables · lazy", "Pagination"],
    "tables.tsx",
  ),
  blocks: entry(
    "Blocks & external chart",
    "Fit a chart into measured blocks; compare explicit errors with clipping.",
    ["Layout · lazy", "External producer"],
    "blocks.tsx · chart.ts",
  ),
  rows: entry(
    "Side-by-side composition",
    "Arrange charts, SVG and nested columns with fixed and weighted widths.",
    ["Layout · lazy", "SVG · lazy"],
    "rows.tsx · chart.ts · optional-table-svg.ts",
  ),
  "rows-overflow": entry(
    "Atomic overflow diagnostic",
    "An intentionally oversized row demonstrates a readable engine diagnostic.",
    ["Layout · lazy", "Intentional error"],
    "rows.tsx · chart.ts · optional-table-svg.ts",
  ),
  painting: entry(
    "Native painting",
    "Draw paths, colors, clips and transforms without a geometry adapter.",
    ["Core", "Vector drawing"],
    "painting.ts",
  ),
  svg: entry(
    "Native SVG adapter",
    "Render a predefined SVG through the optional adapter, loaded only on demand.",
    ["SVG · lazy", "Vector drawing"],
    "svg.ts",
  ),
  branding: entry(
    "Vector brand letterhead",
    "An original Northstar Studio sample identity: SVG logo, branded header and footer. Not official corporate branding.",
    ["SVG · lazy", "Original artwork", "Letter · 612 × 792 pt"],
    "branding.ts · branding-logo.ts · branding-controls.ts",
  ),
  invoice: entry(
    "Business invoice",
    "A reusable business flow with 36 mock items and integer-cent totals. Not for payment.",
    ["Layout · lazy", "Mock data"],
    "examples/business: invoice.tsx · components.tsx · invoice-calculations.ts · invoice-data.ts",
  ),
  manifest: entry(
    "Logistics manifest",
    "48 mock consignments across mixed pages with integer-gram totals. Not for transport.",
    ["Layout · lazy", "Mock data"],
    "examples/business: manifest.tsx · components.tsx · manifest-calculations.ts · manifest-data.ts · invoice-data.ts (shared type)",
  ),
  "freight-invoice": entry(
    "Freight invoice",
    "Three mock freight charges with prepared Liberation Sans fonts. Not for payment.",
    ["Fontkit · lazy", "Mock data"],
    freightFiles,
  ),
  "freight-invoice-extended": entry(
    "Extended freight invoice",
    "Eight mock charges exercise a longer freight document. Not for payment.",
    ["Fontkit · lazy", "Mock data"],
    freightFiles,
  ),
};
