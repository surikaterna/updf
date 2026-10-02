/** @jsxImportSource @updf/core */
import type { Component, VNode } from "@updf/core/vdom";
import type { CmrData, CmrGoodsRow } from "./cmr-types.js";

export interface CellProps {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly content: string;
  readonly font?: string;
}

interface CmrProps {
  readonly data: CmrData;
  readonly font?: string;
}
const fontProps = (font: string | undefined) => (font === undefined ? {} : { font });

export const Cell: Component<CellProps> = ({ x, y, width, height, label, content, font }) => (
  <group x={x} y={y}>
    <rect x={0} y={0} width={width} height={height} />
    <text {...fontProps(font)} x={3} y={3} width={width - 6} height={16} fontSize={5} lineHeight={5 * 1.2} align="left">
      {label}
    </text>
    <text
      {...fontProps(font)}
      x={3}
      y={22}
      width={width - 6}
      height={height - 25}
      fontSize={6}
      lineHeight={6 * 1.2}
      align="left"
      text={content}
    />
  </group>
);

export const MainGrid: Component<CmrProps> = ({ data, font }) => {
  const rows: readonly (readonly [number, string, string, string, string])[] = [
    [64, "1. Sender", data.sender, "6. Terminal", data.terminal],
    [63, "2. Consignee", data.consignee, "7. Shipment / trip", `${data.shipment}\n${data.trip}`],
    [63, "3. Place of delivery", data.delivery, "8. Carrier", data.carrier],
    [63, "4. Taking over the goods", data.takingOver, "9. Successive carriers", data.successiveCarriers],
    [83, "5. Documents attached", data.attachedDocuments, "10. Reservations and observations", data.reservations],
  ];
  let y = 64;
  return rows.map(([height, left, leftValue, right, rightValue]) => {
    const row = (
      <>
        <Cell {...fontProps(font)} x={40} y={y} width={257.5} height={height} label={left} content={leftValue} />
        <Cell {...fontProps(font)} x={297.5} y={y} width={257.5} height={height} label={right} content={rightValue} />
      </>
    );
    y += height;
    return row;
  });
};

export const GoodsGrid: Component<CmrProps> = ({ data, font }) => {
  const columns: readonly (readonly [number, string, keyof CmrGoodsRow])[] = [
    [84.375, "11. Marks", "marks"],
    [44.375, "12. Packages", "packages"],
    [64.375, "13. Packing", "packing"],
    [64.375, "14. Dimensions", "dimensions"],
    [64.375, "15. Goods", "nature"],
    [64.375, "16. Statistical no.", "statistical"],
    [64.375, "17. Weight kg", "weight"],
    [64.375, "18. Volume m3", "volume"],
  ];
  let x = 40;
  return columns.map(([width, label, key]) => {
    const content =
      data.goods.map((row) => row[key]).join("\n\n") + (key === "weight" ? `\n\nTotal: ${data.totalWeight}` : "");
    const cell = <Cell {...fontProps(font)} x={x} y={400} width={width} height={102} label={label} content={content} />;
    x += width;
    return cell;
  });
};

export const CmrPage: Component<CmrProps> = ({ data, font }) => (
  <page width={595} height={842}>
    <text {...fontProps(font)} x={40} y={32} width={515} height={18} fontSize={12} lineHeight={12 * 1.2} align="right">
      CMR - International consignment note (subset)
    </text>
    <MainGrid {...fontProps(font)} data={data} />
    <GoodsGrid {...fontProps(font)} data={data} />
    <Cell
      {...fontProps(font)}
      x={40}
      y={502}
      width={257.5}
      height={99}
      label="19. Sender instructions"
      content={data.instructions}
    />
    <Cell
      {...fontProps(font)}
      x={297.5}
      y={502}
      width={257.5}
      height={33}
      label="20. Payment instructions"
      content={data.payment}
    />
    <Cell
      {...fontProps(font)}
      x={297.5}
      y={535}
      width={257.5}
      height={33}
      label="21. Liability of carriage"
      content={data.liability}
    />
    <Cell
      {...fontProps(font)}
      x={297.5}
      y={568}
      width={257.5}
      height={33}
      label="22. Delivery conditions"
      content={data.conditions}
    />
    <text {...fontProps(font)} x={40} y={620} width={515} height={16} fontSize={9} lineHeight={9 * 1.2} align="center">
      Experimental CMR subset - not operational
    </text>
  </page>
);

export function createCmrTree(data: CmrData, font?: string): VNode {
  return (
    <document version={1}>
      <CmrPage {...fontProps(font)} data={data} />
    </document>
  );
}
