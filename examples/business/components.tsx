/** @jsxImportSource @updf/core */
import { createContext, useContext } from "@updf/core/vdom";
import { Block, type BlockContent, Column, Paragraph, pt, Row, Span } from "@updf/layout";
import type { Address } from "./invoice-data.js";

// Application context is read and explicitly applied by each component, not CSS.
export const businessTheme = {
  accent: [0.12, 0.28, 0.34] as const,
  rule: [0.65, 0.72, 0.74] as const,
  text: { font: "Helvetica", fontSize: 10, lineHeight: pt(14) },
};
export const Theme = createContext(businessTheme);
export function LabelValue({ label, value }: { readonly label: string; readonly value: string }) {
  const theme = useContext(Theme);
  return (
    <Paragraph style={theme.text}>
      <Span style={{ color: theme.accent }}>{`${label}: `}</Span>
      {value}
    </Paragraph>
  );
}
export function AddressBlock({ label, address }: { readonly label: string; readonly address: Address }) {
  const theme = useContext(Theme);
  return (
    <Block style={{ gap: 3, padding: 8, borderLeft: { width: 2, color: theme.accent } }}>
      <Paragraph style={{ ...theme.text, color: theme.accent }}>{label}</Paragraph>
      <Paragraph style={theme.text}>{address.name}</Paragraph>
      {address.lines.map((line) => (
        <Paragraph style={theme.text}>{line}</Paragraph>
      ))}
      <Paragraph style={{ ...theme.text, fontSize: 9 }}>{address.contact}</Paragraph>
    </Block>
  );
}
export function Section({ title, children }: { readonly title: string; readonly children?: BlockContent }) {
  const theme = useContext(Theme);
  return (
    <Block style={{ gap: 6, paddingTop: 8, paddingBottom: 8 }}>
      <Paragraph style={{ ...theme.text, fontSize: 13, color: theme.accent }}>{title}</Paragraph>
      {children ?? null}
    </Block>
  );
}
export function Totals({
  entries,
}: {
  readonly entries: readonly { readonly label: string; readonly value: string }[];
}) {
  const theme = useContext(Theme);
  return (
    <Row style={{ gap: 16, padding: 8, borderTop: { width: 1, color: theme.accent } }}>
      <Column width={{ weight: 1 }}>
        <Paragraph style={theme.text}>All amounts in GBP. Mock transaction only.</Paragraph>
      </Column>
      <Column width={260} style={{ gap: 4 }}>
        {entries.map(({ label, value }) => (
          <Row style={{ gap: 8 }}>
            <Column>
              <Paragraph style={theme.text}>{label}</Paragraph>
            </Column>
            <Column width={110}>
              <Paragraph style={{ ...theme.text, textAlign: "right" }}>{value}</Paragraph>
            </Column>
          </Row>
        ))}
      </Column>
    </Row>
  );
}
export function SignatureArea({ label }: { readonly label: string }) {
  const theme = useContext(Theme);
  return (
    <Block style={{ padding: 8, borderTop: { width: 0.5, color: theme.rule } }}>
      <Paragraph style={theme.text}>{label}</Paragraph>
      <Paragraph style={theme.text}>Unsigned mock document - no signature or approval supplied.</Paragraph>
    </Block>
  );
}
