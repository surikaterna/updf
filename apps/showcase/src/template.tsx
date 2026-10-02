/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { type Component, lower } from "@updf/core/vdom";

const Card: Component<{ readonly title: string }> = ({ title }) => (
  <group x={0} y={0}>
    <rect x={0} y={0} width={350} height={60} paint={{ fill: [0.9, 0.96, 1] }} />
    <text x={12} y={18} width={326} height={28} fontSize={16} lineHeight={20} align="left">
      {title}
    </text>
  </group>
);

export function templateDemo(title: string): Uint8Array {
  const tree = (
    <document version={1}>
      <page width={420} height={300}>
        <group x={35} y={35}>
          <Card title={title} />
        </group>
        <group x={35} y={120}>
          <Card title="Same typed component, reused" />
        </group>
      </page>
      <page width={420} height={300}>
        <group x={35} y={35}>
          <Card title="Explicit second page" />
        </group>
      </page>
    </document>
  );
  return render(lower(tree));
}
