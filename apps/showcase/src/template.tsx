/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { type Component, lower } from "@updf/core/vdom";
import { Block, Document, Flow, Paragraph, pageSize } from "@updf/layout";

const Card: Component<{ readonly title: string }> = ({ title }) => (
  <Block style={{ background: [0.9, 0.96, 1], padding: { top: 18, right: 12, bottom: 22, left: 12 } }}>
    <Paragraph style={{ fontSize: 16, lineHeight: 1.25 }}>{title}</Paragraph>
  </Block>
);

export function templateDemo(title: string): Uint8Array {
  const tree = (
    <Document>
      <Flow pageSize={pageSize(420, 300)} margins={{ top: 35, right: 35, bottom: 35, left: 35 }}>
        <Block style={{ gap: 25 }}>
          <Card title={title} />
          <Card title="Same typed component, reused" />
        </Block>
      </Flow>
      <Flow pageSize={pageSize(420, 300)} margins={{ top: 35, right: 35, bottom: 35, left: 35 }}>
        <Card title="Explicit second page" />
      </Flow>
    </Document>
  );
  return render(lower(tree));
}
