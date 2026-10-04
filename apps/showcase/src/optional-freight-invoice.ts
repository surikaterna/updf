import { freightInvoiceExample } from "../../../examples/business/freight-invoice.js";
import template from "../../../examples/business/freight-invoice.tsx?raw";
import calculations from "../../../examples/business/freight-invoice-calculations.ts?raw";
import data from "../../../examples/business/freight-invoice-data.ts?raw";
import { freightFontResources } from "../../../examples/business/freight-invoice-fonts.js";
import fonts from "../../../examples/business/freight-invoice-fonts.ts?raw";
import sections from "../../../examples/business/freight-invoice-sections.tsx?raw";
import cli from "../../../scripts/freight-invoice-example.ts?raw";
import provenance from "../../../tests/fixtures/fonts/FREIGHT.md?raw";
import boldUrl from "../../../tests/fixtures/fonts/LiberationSans-Bold.ttf?url";
import regularUrl from "../../../tests/fixtures/fonts/LiberationSans-Regular.ttf?url";
import adapter from "./optional-freight-invoice.ts?raw";

let prepared: Promise<ReturnType<typeof freightFontResources>> | undefined;
async function asset(url: string): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to load licensed freight font asset");
  return new Uint8Array(await response.arrayBuffer());
}
export async function freightExample(description: string) {
  prepared ??= Promise.all([asset(regularUrl), asset(boldUrl)]).then(([regular, bold]) =>
    freightFontResources(regular, bold),
  );
  try {
    return freightInvoiceExample(await prepared, description);
  } catch (error) {
    prepared = undefined;
    throw error;
  }
}
export const source = [
  "// Multi-file example: preserve labeled paths and imports. Fonts are licensed assets, not source code.",
  "// examples/business/freight-invoice.tsx",
  template,
  "// examples/business/freight-invoice-sections.tsx",
  sections,
  "// examples/business/freight-invoice-calculations.ts",
  calculations,
  "// examples/business/freight-invoice-data.ts",
  data,
  "// examples/business/freight-invoice-fonts.ts",
  fonts,
  "// scripts/freight-invoice-example.ts (Node-only CLI)",
  cli,
  "// apps/showcase/src/optional-freight-invoice.ts (browser-only loader)",
  adapter,
  "// tests/fixtures/fonts/FREIGHT.md (asset provenance; retain adjacent OFL LICENSE)",
  provenance,
].join("\n");
