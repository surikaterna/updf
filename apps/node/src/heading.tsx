/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { type Component, lower } from "@updf/core/vdom";

const Heading: Component<{ readonly title: string }> = ({ title }) => (
  <text x={0} y={0} width={200} height={24} fontSize={10} lineHeight={12} align="left">
    {title}
  </text>
);
const tree = (
  <document version={1}>
    <page width={595} height={842}>
      <group x={40} y={40}>
        <Heading title="Reusable native TSX" />
      </group>
    </page>
  </document>
);
export const bytes: Uint8Array = render(lower(tree));
