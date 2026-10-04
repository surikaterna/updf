/** @jsxImportSource @updf/core */
import { useContext } from "@updf/core/vdom";
import { Block, type BlockContent, Column, PageContext, Paragraph, pt, Row } from "@updf/layout";
import { calculateFreight, freightMoney } from "./freight-invoice-calculations.js";
import type { FreightInvoiceData } from "./freight-invoice-data.js";

const pale = [0.97, 0.97, 0.97] as const;
const gray = [0.87, 0.87, 0.87] as const;
const rule = { width: 1, color: [0.7, 0.7, 0.7] as const };
const text = { font: "FreightRegular", fontSize: 9, lineHeight: pt(14) };
export function FreightText({ children, bold = false }: { readonly children: string; readonly bold?: boolean }) {
  return <Paragraph style={{ ...text, font: bold ? "FreightBold" : "FreightRegular" }}>{children}</Paragraph>;
}
export function FreightHeader({ data }: { readonly data: FreightInvoiceData }) {
  const page = useContext(PageContext);
  return (
    <Row style={{ backgroundColor: pale, padding: 6, borderBottom: rule, gap: 8 }}>
      <Column width={{ weight: 1 }}>
        <Paragraph style={{ ...text, font: "FreightBold", fontSize: 24, lineHeight: pt(28) }}>ASTER WAKE</Paragraph>
        <FreightText bold>FREIGHT / FICTIONAL</FreightText>
        <FreightText>MOCK - NOT FOR PAYMENT</FreightText>
      </Column>
      <Column width={{ weight: 1 }}>
        <FreightText bold>Mock office</FreightText>
        <FreightText>Aster Wake Shipping</FreightText>
        <FreightText>Sample harbour studio</FreightText>
        <FreightText>Demo City, fictional site</FreightText>
        <FreightText>office@example.invalid</FreightText>
        <FreightText>Tax ID: NOT ASSIGNED</FreightText>
      </Column>
      <Column width={{ weight: 1 }}>
        <Paragraph
          style={{
            ...text,
            font: "FreightBold",
            fontSize: 32,
            lineHeight: pt(38),
            color: [0.08, 0.16, 0.62],
            textAlign: "right",
          }}
        >
          Invoice
        </Paragraph>
        {[
          data.number,
          `Issued: ${data.issued}`,
          `Due: ${data.due}`,
          `Page ${page.docPageNumber} of ${page.docPageCount}`,
        ].map((value) => (
          <Paragraph style={{ ...text, textAlign: "right" }}>{value}</Paragraph>
        ))}
      </Column>
    </Row>
  );
}
export function FreightBilling({
  data,
  description,
}: {
  readonly data: FreightInvoiceData;
  readonly description: string;
}) {
  return (
    <Block style={{ gap: 4, paddingTop: 8, paddingBottom: 8 }}>
      <FreightText bold>Bill to</FreightText>
      <Row style={{ gap: 10 }}>
        <Column style={{ backgroundColor: pale, padding: 4, border: rule, minHeight: 80 }}>
          {data.buyer.map((line, index) => (
            <FreightText bold={index === 0}>{line}</FreightText>
          ))}
        </Column>
        <Column style={{ backgroundColor: pale, padding: 4, border: rule, minHeight: 80 }}>
          <FreightText bold>Account: MOCK ACCOUNT</FreightText>
          <FreightText>Tax registration: NOT ASSIGNED</FreightText>
          <Paragraph style={text} breakLongWords="codePoint">
            {description}
          </Paragraph>
        </Column>
      </Row>
      <FreightText bold>
        Original demo only. Discuss sample discrepancies with our fictional team; never send payment.
      </FreightText>
    </Block>
  );
}
function ShipmentPanel({
  heading,
  children,
  shaded = true,
}: {
  readonly heading: string;
  readonly children: BlockContent;
  readonly shaded?: boolean;
}) {
  return (
    <Column style={{ backgroundColor: shaded ? pale : [1, 1, 1] }}>
      <Block style={{ backgroundColor: gray, padding: 2 }}>
        <FreightText bold>{heading}</FreightText>
      </Block>
      <Block style={{ padding: 4, gap: 2 }}>{children}</Block>
    </Column>
  );
}
export function FreightShipment({ data }: { readonly data: FreightInvoiceData }) {
  const totals = calculateFreight(data.charges);
  return (
    <Row align="stretch" style={{ borderBottom: rule }}>
      <ShipmentPanel heading="Route details">
        {data.route.map((line, index) => (
          <FreightText bold={index < 2}>{line}</FreightText>
        ))}
      </ShipmentPanel>
      <ShipmentPanel heading="Vehicle">
        {data.vehicle.map((line) => (
          <FreightText>{line}</FreightText>
        ))}
      </ShipmentPanel>
      <ShipmentPanel heading="Shipment">
        {data.shipment.map((line, index) => (
          <FreightText bold={index === 0}>{line}</FreightText>
        ))}
      </ShipmentPanel>
      <ShipmentPanel heading="Charges" shaded={false}>
        {data.charges.map((charge) => (
          <Block>
            <Row>
              <Column>
                <FreightText>{charge.label}</FreightText>
              </Column>
              <Column width={44}>
                <Paragraph style={{ ...text, textAlign: "right" }}>{freightMoney(charge.netPence)}</Paragraph>
              </Column>
            </Row>
            <FreightText>{`VAT ${charge.vatBasisPoints / 100}%`}</FreightText>
          </Block>
        ))}
        <Block style={{ border: { width: 1, color: [0, 0, 0] }, padding: 3 }}>
          <FreightText bold>{`ORDER NET ${freightMoney(totals.netPence)}`}</FreightText>
        </Block>
      </ShipmentPanel>
    </Row>
  );
}
function SummaryLine({ label, amount }: { readonly label: string; readonly amount: number }) {
  return (
    <Row>
      <Column>
        <FreightText>{label}</FreightText>
      </Column>
      <Column width={72}>
        <Paragraph style={{ ...text, textAlign: "right" }}>{freightMoney(amount)}</Paragraph>
      </Column>
    </Row>
  );
}
export function FreightSummary({ data }: { readonly data: FreightInvoiceData }) {
  const totals = calculateFreight(data.charges);
  return (
    <Block style={{ gap: 4 }}>
      <Row>
        <Column width={{ weight: 2 }}>{null}</Column>
        <Column width={{ weight: 3 }} style={{ borderTop: { width: 1, color: [0, 0, 0] }, padding: 6, gap: 2 }}>
          <FreightText bold>NET Total</FreightText>
          {data.charges.map((charge) => (
            <SummaryLine label={charge.label} amount={charge.netPence} />
          ))}
          <FreightText bold>{`Net subtotal ${freightMoney(totals.netPence)}`}</FreightText>
          <SummaryLine label="VAT Total (per charge)" amount={totals.vatPence} />
          <Row style={{ border: { width: 1, color: [0, 0, 0] }, padding: 5 }}>
            <Column>
              <Paragraph style={{ ...text, font: "FreightBold", fontSize: 18, lineHeight: pt(22) }}>
                Invoice Total
              </Paragraph>
            </Column>
            <Column width={100}>
              <Paragraph style={{ ...text, font: "FreightBold", fontSize: 18, lineHeight: pt(22), textAlign: "right" }}>
                {freightMoney(totals.grossPence)}
              </Paragraph>
            </Column>
          </Row>
        </Column>
      </Row>
      <PaymentPlaceholders />
    </Block>
  );
}
function PaymentPlaceholders() {
  return (
    <Block style={{ borderTop: { width: 1, color: [0, 0, 0] }, paddingTop: 4 }}>
      <FreightText>
        This fictional shipment illustrates layout only. No carriage contract, liability promise or payment obligation
        exists.
      </FreightText>
      <Row style={{ gap: 12, paddingTop: 4 }}>
        <Column>
          <FreightText bold>Payment contact (mock)</FreightText>
          <FreightText>Aster Wake demo desk</FreightText>
          <FreightText>billing@example.invalid</FreightText>
        </Column>
        <Column>
          <FreightText bold>Bank (placeholder)</FreightText>
          <FreightText>No bank appointed</FreightText>
          <FreightText>Do not remit funds</FreightText>
        </Column>
        <Column>
          <FreightText bold>Account (placeholder)</FreightText>
          <FreightText>Account / IBAN: NONE</FreightText>
          <FreightText>MOCK - NOT FOR PAYMENT</FreightText>
        </Column>
      </Row>
    </Block>
  );
}
