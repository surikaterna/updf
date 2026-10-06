/** @jsxImportSource @updf/core */
/** @jsxRuntime automatic */
import type { VNode } from "@updf/core/vdom";

export function imageTree(): VNode {
  return (
    <document version={1}>
      <page width={100} height={100}>
        <xObject resource="photo" x={10} y={20} width={60} height={40} />
      </page>
    </document>
  );
}
