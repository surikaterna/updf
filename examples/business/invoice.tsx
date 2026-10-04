/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { useContext } from "@updf/core/vdom";
import { Column, createExtensions, Document, Flow, layout, PageContext, PageSize, Paragraph, Row } from "@updf/layout";
import { Table, tableExtension } from "@updf/tables";
import { AddressBlock, businessTheme, LabelValue, Section, SignatureArea, Theme, Totals } from "./components.js";
import { calculateInvoice, money } from "./invoice-calculations.js";
import { type InvoiceData, mockInvoice } from "./invoice-data.js";

function Footer({ number }: { readonly number: string }) {
  const page = useContext(PageContext);
  const theme = useContext(Theme);
  return (
    <Paragraph style={{ ...theme.text, fontSize: 9, color: theme.accent }}>
      {`${number} | MOCK - NOT FOR PAYMENT | Page ${page.docPageNumber}/${page.docPageCount}`}
    </Paragraph>
  );
}
function InvoiceIntro({ data, title }: { readonly data: InvoiceData; readonly title: string }) {
  const theme = useContext(Theme);
  return (
    <Section title="INVOICE / ORIGINAL MOCK DATA">
      <Paragraph style={{ ...theme.text, fontSize: 16, color: theme.accent }}>{title}</Paragraph>
      <Row style={{ gap: 16 }}>
        <Column>
          <AddressBlock label="From" address={data.seller} />
        </Column>
        <Column>
          <AddressBlock label="Bill to / Deliver to" address={data.buyer} />
        </Column>
      </Row>
      <Row style={{ gap: 16 }}>
        <Column>
          <LabelValue label="Invoice" value={data.number} />
          <LabelValue label="Issued" value={data.issued} />
        </Column>
        <Column>
          <LabelValue label="Due (net 30)" value={data.due} />
          <LabelValue label="Order" value={data.reference} />
        </Column>
      </Row>
    </Section>
  );
}
function InvoiceLines({ data }: { readonly data: InvoiceData }) {
  const theme = useContext(Theme);
  const totals = calculateInvoice(data);
  return (
    <Table
      columns={[
        { width: 62 },
        { width: { weight: 1, min: 160 } },
        { width: 35, style: { textAlign: "right" } },
        { width: 40 },
        { width: 78, style: { textAlign: "right" } },
        { width: 85, style: { textAlign: "right" } },
      ]}
      style={{ ...theme.text, fontSize: 9, padding: 6 }}
      grid={{ width: 0.5, color: theme.rule }}
    >
      <Table.Head repeat>
        <Table.Row style={{ borderBottom: { width: 1.5, color: theme.accent } }}>
          {["Item", "Description", "Qty", "Unit", "Unit price", "Line total"].map((label) => (
            <Table.HeaderCell>{label}</Table.HeaderCell>
          ))}
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {data.items.map((item, index) => (
          <Table.Row key={item.code} keepTogether>
            <Table.Cell>{item.code}</Table.Cell>
            <Table.Cell>{item.description}</Table.Cell>
            <Table.Cell>{String(item.quantity)}</Table.Cell>
            <Table.Cell>{item.unit}</Table.Cell>
            <Table.Cell>{money(item.unitCents)}</Table.Cell>
            <Table.Cell>{money(totals.lines[index] ?? 0)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
function InvoiceClosing({ data }: { readonly data: InvoiceData }) {
  const totals = calculateInvoice(data);
  return (
    <Section title="Settlement summary">
      <Totals
        entries={[
          { label: "Goods subtotal", value: money(totals.subtotalCents) },
          { label: `Discount ${data.discountBasisPoints / 100}%`, value: `-${money(totals.discountCents)}` },
          { label: "Shipping (taxable)", value: money(data.shippingCents) },
          { label: "VAT base", value: money(totals.taxableCents) },
          { label: `VAT ${data.vatBasisPoints / 100}%`, value: money(totals.vatCents) },
          { label: "GRAND TOTAL", value: money(totals.grandTotalCents) },
        ]}
      />
      <LabelValue label="Terms" value="Net 30 days. Do not remit payment: this is fictional example paperwork." />
      <LabelValue
        label="Tax policy"
        value="Invoice-level 5% goods discount; 20% VAT on discounted goods plus shipping. Rounded half-up to cents."
      />
      <SignatureArea label="Prepared by: Demo accounts team (fictional)" />
    </Section>
  );
}
export function invoiceExample(title = "Studio equipment supply", data: InvoiceData = mockInvoice) {
  const totals = calculateInvoice(data);
  const result = layout(
    <Theme.Provider value={businessTheme}>
      <Document>
        <Flow
          pageSize={PageSize.A4}
          margins={{ top: 30, right: 30, bottom: 30, left: 30 }}
          extensions={createExtensions([tableExtension])}
        >
          <Flow.Header height={24}>
            <Paragraph
              style={{ font: "Helvetica", fontSize: 9 }}
            >{`${data.seller.name} | ${data.number} | MOCK INVOICE`}</Paragraph>
          </Flow.Header>
          <Flow.Body>
            <InvoiceIntro data={data} title={title} />
            <InvoiceLines data={data} />
            <InvoiceClosing data={data} />
          </Flow.Body>
          <Flow.Footer height={18}>
            <Footer number={data.number} />
          </Flow.Footer>
        </Flow>
      </Document>
    </Theme.Provider>,
  );
  return {
    bytes: render(result.document),
    result,
    totals,
    metadata: {
      kind: "original-mock-invoice",
      number: data.number,
      issued: data.issued,
      reference: data.reference,
      due: data.due,
      currency: "GBP",
      title,
      itemCount: data.items.length,
      pageCount: result.pageCount,
      totals,
    },
  };
}
