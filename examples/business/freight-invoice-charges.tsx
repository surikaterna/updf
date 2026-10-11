/** @jsxImportSource @updf/core */
import { pt } from "@updf/layout";
import { Table } from "@updf/tables";
import { calculateFreight, freightMoney } from "./freight-invoice-calculations.js";
import type { FreightInvoiceData } from "./freight-invoice-data.js";

export function FreightCharges({ data }: { readonly data: FreightInvoiceData }) {
  const totals = calculateFreight(data.charges);
  return (
    <Table
      columns={[
        { width: { weight: 1, min: 200 } },
        { width: 52, style: { textAlign: "right" } },
        { width: 80, style: { textAlign: "right" } },
        { width: 80, style: { textAlign: "right" } },
      ]}
      style={{ font: "FreightRegular", fontSize: 9, lineHeight: pt(14), padding: 6 }}
      grid={{ width: 0.5, color: [0.7, 0.7, 0.7] }}
    >
      <Table.Head repeat>
        <Table.Row style={{ font: "FreightBold", backgroundColor: [0.87, 0.87, 0.87] }}>
          <Table.HeaderCell>Charges</Table.HeaderCell>
          <Table.HeaderCell>VAT %</Table.HeaderCell>
          <Table.HeaderCell>Net GBP</Table.HeaderCell>
          <Table.HeaderCell>VAT GBP</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {data.charges.map((charge, index) => (
          <Table.Row key={`charge-${index}`} keepTogether>
            <Table.Cell>{charge.label}</Table.Cell>
            <Table.Cell>{`${charge.vatBasisPoints / 100}%`}</Table.Cell>
            <Table.Cell>{freightMoney(charge.netPence)}</Table.Cell>
            <Table.Cell>{freightMoney(totals.taxes[index]!)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
