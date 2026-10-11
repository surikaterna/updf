import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import type { DocumentDefinition } from "@updf/core";
import { h } from "@updf/core/vdom";
import { Block, createExtensions, Document, Flow, PageSize } from "@updf/layout";
import { tableExtension } from "@updf/tables";
import { FreightCharges } from "../../examples/business/freight-invoice-charges.js";
import { freightInvoiceExample } from "../../examples/business/freight-invoice.js";
import {
  extendedFreightInvoice,
  type FreightInvoiceData,
  mockFreightInvoice,
} from "../../examples/business/freight-invoice-data.js";
import {
  FreightBilling,
  FreightHeader,
  FreightShipment,
  FreightSummary,
} from "../../examples/business/freight-invoice-sections.js";
import { freightFonts } from "../fixtures/fonts/freight-fonts.js";
import { layout, render } from "../fixtures/text-options.js";
import { freightGeometry, freightRaster } from "./freight-pdf-checks.js";
import { eraseRegion } from "./manifest-pdf-checks.js";

function placeSummary(input: DocumentDefinition, y: number, duplicate = false): DocumentDefinition {
  return {
    ...input,
    pages: input.pages.map((page, index) => {
      if (index !== input.pages.length - 1) return page;
      const children = [...page.children];
      const last = children.at(-1);
      assert.ok(last && last.type === "paintGroup");
      const positioned = { ...last, transform: [1, 0, 0, 1, 12, y] as const };
      children[children.length - 1] = positioned;
      if (duplicate) children.push({ ...positioned, transform: [1, 0, 0, 1, 12, y + 3] });
      return { ...page, children };
    }),
  };
}
function ordinary(data: FreightInvoiceData, resources: Awaited<ReturnType<typeof freightFonts>>) {
  return layout(
    h(Document, {
      children: h(Flow, {
        pageSize: PageSize.A4,
        margins: { top: 12, right: 12, bottom: 12, left: 12 },
        extensions: createExtensions([tableExtension]),
        children: [
          h(Flow.Header, { height: 112, children: h(FreightHeader, { data }) }),
          h(Flow.Body, {
            children: [
              h(FreightBilling, { data, description: "Single mock freight passage" }),
              h(FreightShipment, { data }),
              h(FreightCharges, { data }),
              h(Block, { keepTogether: true, children: h(FreightSummary, { data }) }),
            ],
          }),
        ],
      }),
    }),
    { resources },
  );
}
test("freight auto-margin equals independently positioned ordinary flow; real wrong-top/duplicate/overlap PDFs reject", async () => {
  const resources = await freightFonts();
  const directory = new URL("../../artifacts/freight-invoice/", import.meta.url);
  await mkdir(directory, { recursive: true });
  for (const [name, data, height] of [
    ["original", mockFreightInvoice, 131],
    ["extended", extendedFreightInvoice, 131],
  ] as const) {
    const actual = freightInvoiceExample(resources, undefined, data);
    const top = 841.8897637795277 - 12 - height;
    const control = ordinary(data, resources);
    assert.equal(control.placements.at(-1)?.box.height, height);
    assert.deepEqual(render(placeSummary(control.document, top), { resources }), actual.bytes);
    const geometry = (bbox: string) => freightGeometry(bbox, top);
    for (const [variant, document] of [
      ["control", placeSummary(control.document, top)],
      ["wrong-top", placeSummary(control.document, 124)],
      ["duplicate", placeSummary(control.document, top, true)],
      ["body-overlap", placeSummary(control.document, name === "original" ? 300 : 30)],
    ] as const) {
      const path = new URL(`${name}-${variant}.pdf`, directory).pathname;
      await writeFile(path, render(document, { resources }));
      execFileSync("qpdf", ["--check", path]);
      const bbox = execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" });
      if (variant !== "control") {
        assert.throws(() => geometry(bbox), assert.AssertionError, `${name}-${variant}`);
        continue;
      }
      geometry(bbox);
      execFileSync("pdftoppm", ["-r", "72", path, path]);
      const ppm = await readFile(`${path}-${actual.result.pageCount}.ppm`);
      const tableBottom = name === "original" ? 481 : 616;
      freightRaster(ppm, top, tableBottom);
      assert.throws(
        () => freightRaster(eraseRegion(ppm, 12, Math.floor(top), 583, Math.ceil(top + 2)), top, tableBottom),
        assert.AssertionError,
      );
    }
  }
});
