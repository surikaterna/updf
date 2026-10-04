/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import type { PreparedFont } from "@updf/core/fonts";
import { Document, Flow, layout, PageSize } from "@updf/layout";
import { calculateFreight } from "./freight-invoice-calculations.js";
import { type FreightInvoiceData, mockFreightInvoice } from "./freight-invoice-data.js";
import { FreightBilling, FreightFooter, FreightHeader, FreightShipment } from "./freight-invoice-sections.js";

export function freightInvoiceExample(
  resources: Readonly<Record<string, PreparedFont>>,
  description = "Single mock freight passage",
  data: FreightInvoiceData = mockFreightInvoice,
) {
  if (description.length > 40 || /[\r\n]/u.test(description))
    throw new Error("Freight description must be one line, at most 40 characters");
  const totals = calculateFreight(data.charges);
  // A repeating financial footer is safe only with a hard one-page operation budget.
  const options = { resources, limits: { pages: 1 } };
  const result = layout(
    <Document>
      <Flow pageSize={PageSize.A4} margins={{ top: 12, right: 12, bottom: 12, left: 12 }}>
        <Flow.Header height={112}>
          <FreightHeader data={data} />
        </Flow.Header>
        <Flow.Body>
          <FreightBilling data={data} description={description} />
          <FreightShipment data={data} />
        </Flow.Body>
        <Flow.Footer height={238}>
          <FreightFooter data={data} />
        </Flow.Footer>
      </Flow>
    </Document>,
    options,
  );
  return {
    bytes: render(result.document, options),
    result,
    metadata: {
      kind: "original-mock-freight-invoice",
      heading: "Invoice",
      description,
      number: data.number,
      pageCount: result.pageCount,
      currency: "GBP",
      totals,
    },
  };
}
