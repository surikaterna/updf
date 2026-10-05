/** @jsxImportSource @updf/core */

import { useContext } from "@updf/core/vdom";
import { Column, createExtensions, Document, Flow, PageContext, PageSize, Paragraph, Row, Span } from "@updf/layout";
import { Table, tableExtension } from "@updf/tables";
import { layout, render } from "../text-options.js";
import { AddressBlock, businessTheme, LabelValue, Section, SignatureArea, Theme, Totals } from "./components.js";
import { calculateManifest, consignmentTotals, kilograms } from "./manifest-calculations.js";
import { type ManifestData, type ManifestRoute, mockManifest } from "./manifest-data.js";

function Footer({ number }: { readonly number: string }) {
  const page = useContext(PageContext),
    theme = useContext(Theme);
  return (
    <Paragraph
      style={{ ...theme.text, fontSize: 9, color: theme.accent }}
    >{`${number} | ORIGINAL MOCK / NOT FOR TRANSPORT | Page ${page.docPageNumber}/${page.docPageCount}`}</Paragraph>
  );
}
function ManifestFlow({
  data,
  section,
  landscape = false,
  children,
}: {
  readonly data: ManifestData;
  readonly section: string;
  readonly landscape?: boolean;
  readonly children?: import("@updf/layout").BlockContent;
}) {
  const theme = useContext(Theme);
  return (
    <Flow
      pageSize={PageSize.A4}
      orientation={landscape ? "landscape" : "portrait"}
      margins={{ top: 30, right: 30, bottom: 30, left: 30 }}
      extensions={createExtensions([tableExtension])}
    >
      <Flow.Header height={24}>
        <Paragraph style={{ ...theme.text, fontSize: 9 }}>{`${data.number} | ${section} | ORIGINAL MOCK`}</Paragraph>
      </Flow.Header>
      <Flow.Body>{children ?? null}</Flow.Body>
      <Flow.Footer height={18}>
        <Footer number={data.number} />
      </Flow.Footer>
    </Flow>
  );
}
function Summary({ data, title }: { readonly data: ManifestData; readonly title: string }) {
  const theme = useContext(Theme),
    totals = calculateManifest(data);
  return (
    <Section title="DISPATCH SUMMARY / ORIGINAL MOCK DATA">
      <Paragraph style={{ ...theme.text, fontSize: 16, color: theme.accent }}>{title}</Paragraph>
      <Row style={{ gap: 16 }}>
        <Column>
          <AddressBlock label="Dispatch site" address={data.depot} />
        </Column>
        <Column>
          <AddressBlock label="Contract carrier" address={data.carrier} />
        </Column>
      </Row>
      <LabelValue label="Manifest" value={data.number} />
      <LabelValue label="Dispatch clock" value={data.dispatched} />
      <LabelValue
        label="Load convention"
        value="Each loose carton and each loaded pallet is one handling package. Pallet gross mass already includes its contents and support; loose cartons are additional, never counted twice."
      />
      <LabelValue
        label="Route plan"
        value={`${data.routes.length} scheduled circuits from dispatch hall C. Landscape sheets list stops in loading order; time windows are fictional depot-local slots, not delivery guarantees.`}
      />
      {totals.groups.map((group, index) => (
        <LabelValue
          label={`${group.code} / ${data.routes[index]?.name}`}
          value={`${group.consignmentCount} consignments; ${group.cartons} cartons + ${group.pallets} pallets = ${group.packages} packages; ${kilograms(group.grams)}`}
        />
      ))}
      <ManifestTotals data={data} />
      <Paragraph style={theme.text}>
        <Span style={{ color: theme.accent }}>Operational caution: </Span>This example is not a legal transport form,
        dangerous-goods declaration, customs document or proof of delivery. No actual cargo is dispatched.
      </Paragraph>
    </Section>
  );
}
function ManifestTotals({ data }: { readonly data: ManifestData }) {
  const totals = calculateManifest(data);
  return (
    <Totals
      note="Application totals: integer grams and handling packages. Original fictional load only."
      entries={[
        { label: "Consignments", value: String(totals.consignmentCount) },
        { label: "Loose cartons", value: String(totals.cartons) },
        { label: "Loaded pallets", value: String(totals.pallets) },
        { label: "Handling packages", value: String(totals.packages) },
        { label: "Gross load mass", value: kilograms(totals.grams) },
      ]}
    />
  );
}
function RouteTable({ route }: { readonly route: ManifestRoute }) {
  const theme = useContext(Theme);
  return (
    <Section title={`${route.code} / ${route.name} / LOADING ORDER`}>
      <Table
        columns={[
          { width: 58 },
          { width: 145 },
          { width: { weight: 1, min: 180 } },
          { width: 65 },
          { width: 80 },
          { width: 75 },
          { width: 72 },
        ]}
        style={{ ...theme.text, fontSize: 9, padding: 6 }}
        grid={{ width: 0.5, color: theme.rule }}
      >
        <Table.Head repeat>
          <Table.Row style={{ borderBottom: { width: 1.5, color: theme.accent } }}>
            {[
              `${route.code} / ID`,
              "Receiving site",
              "Goods / special instructions",
              "C / P / Pkg",
              "Gross kg",
              "Time slot",
              "Status",
            ].map((label) => (
              <Table.HeaderCell>{label}</Table.HeaderCell>
            ))}
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {route.consignments.map((item) => (
            <ConsignmentRow item={item} />
          ))}
        </Table.Body>
      </Table>
    </Section>
  );
}
function ConsignmentRow({ item }: { readonly item: import("./manifest-data.js").Consignment }) {
  const theme = useContext(Theme),
    total = consignmentTotals(item);
  return (
    <Table.Row key={item.id} keepTogether>
      <Table.Cell>{item.id}</Table.Cell>
      <Table.Cell>{item.destination}</Table.Cell>
      <Table.Cell>
        <Paragraph style={{ ...theme.text, fontSize: 9 }}>{item.goods}</Paragraph>
        <Paragraph style={{ ...theme.text, fontSize: 9 }}>
          <Span style={{ color: theme.accent, backgroundColor: [0.88, 0.94, 0.95] }}>Care: </Span>
          {item.instructions}
        </Paragraph>
      </Table.Cell>
      <Table.Cell>{`${item.cartons} / ${item.pallets} / ${total.packages}`}</Table.Cell>
      <Table.Cell>{kilograms(total.grams)}</Table.Cell>
      <Table.Cell>{item.slot}</Table.Cell>
      <Table.Cell style={{ borderLeft: { width: 1, color: theme.accent } }}>{item.status}</Table.Cell>
    </Table.Row>
  );
}
function Acknowledgment({ data }: { readonly data: ManifestData }) {
  return (
    <Section title="RECONCILIATION / UNSIGNED ACKNOWLEDGMENT">
      <LabelValue
        label="End of loading order"
        value="All listed circuits are complete. This summary reconciles the entire fictional load, not only the last landscape sheet."
      />
      <ManifestTotals data={data} />
      <LabelValue
        label="Exception procedure"
        value="Hold: wrap means retain at dispatch until protective wrap is checked. Staged, Checked and Ready are planning states only; none attests to receipt or release."
      />
      <LabelValue
        label="Receiving check"
        value="Compare package labels, carton count and pallet count before unloading. Record shortages on separate operational paperwork; no real receiving event or personal details are represented here."
      />
      <SignatureArea label="Dispatch reconciliation / carrier acknowledgment (fictional teams)" />
    </Section>
  );
}
export function manifestExample(title = "Bracken Loop / morning dispatch", data: ManifestData = mockManifest) {
  const totals = calculateManifest(data);
  const result = layout(
    <Theme.Provider value={businessTheme}>
      <Document>
        <ManifestFlow data={data} section="Dispatch summary">
          <Summary data={data} title={title} />
        </ManifestFlow>
        <ManifestFlow data={data} section="Consignment flow" landscape>
          {data.routes.map((route) => (
            <RouteTable route={route} />
          ))}
        </ManifestFlow>
        <ManifestFlow data={data} section="Acknowledgment">
          <Acknowledgment data={data} />
        </ManifestFlow>
      </Document>
    </Theme.Provider>,
  );
  return {
    bytes: render(result.document),
    result,
    totals,
    metadata: {
      kind: "original-mock-manifest",
      number: data.number,
      dispatched: data.dispatched,
      title,
      pageCount: result.pageCount,
      sectionOrder: ["Dispatch summary", "Consignment flow", "Acknowledgment"],
      consignmentOrder: data.routes.flatMap((route) => route.consignments.map((item) => item.id)),
      totals,
    },
  };
}
