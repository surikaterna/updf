import type { DocumentDefinition, NodeDefinition, TextAlign, RichTextNode } from "@updf/core";
import { type OperationOptions, render } from "@updf/core";
import type { CmrData, CmrGoodsRow } from "./cmr-types.js";
import { cmrTextOptions } from "./text-options.js";
import { cmrParagraph } from "./cmr-paragraph.js";

export type { CmrData, CmrGoodsRow } from "./cmr-types.js";

export function renderCMR(document: DocumentDefinition, options: OperationOptions = {}): Uint8Array<ArrayBuffer> {
  return render(document, cmrTextOptions(options));
}

const text = (
  x: number,
  y: number,
  width: number,
  height: number,
  value: string,
  fontSize = 6,
  align: TextAlign = "left",
): RichTextNode => ({
  type: "richText",
  x,
  y,
  width,
  height,
  paragraphs: cmrParagraph(value, fontSize, align),
});

function cell(x: number, y: number, width: number, height: number, label: string, content: string): NodeDefinition[] {
  return [
    { type: "rect", x, y, width, height },
    text(x + 3, y + 3, width - 6, 16, label, 5),
    text(x + 3, y + 22, width - 6, height - 25, content),
  ];
}

function mainGrid(data: CmrData): NodeDefinition[] {
  const rows: readonly (readonly [number, string, string, string, string])[] = [
    [64, "1. Sender", data.sender, "6. Terminal", data.terminal],
    [63, "2. Consignee", data.consignee, "7. Shipment / trip", `${data.shipment}\n${data.trip}`],
    [63, "3. Place of delivery", data.delivery, "8. Carrier", data.carrier],
    [63, "4. Taking over the goods", data.takingOver, "9. Successive carriers", data.successiveCarriers],
    [83, "5. Documents attached", data.attachedDocuments, "10. Reservations and observations", data.reservations],
  ];
  let y = 64;
  return rows.flatMap(([height, left, leftValue, right, rightValue]) => {
    const children = [
      ...cell(40, y, 257.5, height, left, leftValue),
      ...cell(297.5, y, 257.5, height, right, rightValue),
    ];
    y += height;
    return children;
  });
}

function goods(data: CmrData): NodeDefinition[] {
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
  return columns.flatMap(([width, label, key]) => {
    const content = data.goods.map((row) => row[key]).join("\n\n");
    const total = key === "weight" ? `\n\nTotal: ${data.totalWeight}` : "";
    const children = cell(x, 400, width, 102, label, content + total);
    x += width;
    return children;
  });
}

export function createCmrDocument(data: CmrData): DocumentDefinition {
  return {
    version: 1,
    pages: [
      {
        width: 595,
        height: 842,
        children: [
          text(40, 32, 515, 18, "CMR - International consignment note (subset)", 12, "right"),
          ...mainGrid(data),
          ...goods(data),
          ...cell(40, 502, 257.5, 99, "19. Sender instructions", data.instructions),
          ...cell(297.5, 502, 257.5, 33, "20. Payment instructions", data.payment),
          ...cell(297.5, 535, 257.5, 33, "21. Liability of carriage", data.liability),
          ...cell(297.5, 568, 257.5, 33, "22. Delivery conditions", data.conditions),
          text(40, 620, 515, 16, "Experimental CMR subset - not operational", 9, "center"),
        ],
      },
    ],
  };
}

export const cmrFixture = Object.freeze({
  sender: "North Goods AB\nHarbour Road 12\n41100 Gothenburg\nSE",
  terminal: "West Terminal\nDock 4\nSE",
  consignee: "Example Retail Ltd\nMarket Street 8\nLondon\nGB",
  shipment: "Shipment: DEMO-1042",
  trip: "Trip: TRIP-27",
  delivery: "Example Retail warehouse\nLondon\n2026-10-02",
  carrier: "Example Carrier AB",
  takingOver: "Gothenburg\n2026-10-01",
  successiveCarriers: "None",
  attachedDocuments: "Packing list PL-1042",
  reservations: "No reservations in this synthetic fixture",
  goods: Object.freeze([
    Object.freeze({
      marks: "BOX-A",
      packages: "12",
      packing: "Cartons",
      dimensions: "40x30x20",
      nature: "Parts",
      statistical: "8708",
      weight: "120",
      volume: "0.288",
    }),
    Object.freeze({
      marks: "BOX-B",
      packages: "8",
      packing: "Cartons",
      dimensions: "50x40x30",
      nature: "Tools",
      statistical: "8205",
      weight: "80",
      volume: "0.480",
    }),
  ]),
  totalWeight: "200 kg",
  instructions: "Keep dry\nDelivery: 2026-10-02\nClient reference: CLIENT-42",
  payment: "Prepaid",
  liability: "CMR convention",
  conditions: "By appointment",
} satisfies CmrData);
