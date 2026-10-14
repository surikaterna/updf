/** @jsxImportSource @updf/core */
import { Logo } from "./graphic.js";

export const document = (
  <document version={1}>
    <page width={100} height={80}>
      <Logo x={10} y={15} w={60} h={40} />
    </page>
  </document>
);
