import type { Address } from "./invoice-data.js";

export interface Consignment {
  readonly id: string;
  readonly destination: string;
  readonly goods: string;
  readonly instructions: string;
  readonly cartons: number;
  readonly pallets: number;
  readonly cartonGrams: number;
  readonly palletGrams: number;
  readonly slot: string;
  readonly status: string;
}
export interface ManifestRoute {
  readonly code: string;
  readonly name: string;
  readonly consignments: readonly Consignment[];
}
export interface ManifestData {
  readonly number: string;
  readonly dispatched: string;
  readonly depot: Address;
  readonly carrier: Address;
  readonly routes: readonly ManifestRoute[];
}

const destinations = [
  "Copper Quay / Receiving bay 2, Samplehaven",
  "Alder Works / Covered stores, Mockbridge",
  "Reed Market / Service entrance, Fableton",
  "Orchard Yard / Goods-in lane 4, Examplemere",
] as const;
const freight = [
  [
    "Reusable display frames; corner protectors and hardware packed separately.",
    "Keep dry. Unload frames upright; return empty stillages to the collection lane.",
  ],
  [
    "Ceramic planter kits; nested trays with paper separators and spare saucers.",
    "Fragile. Do not stack above two tiers; use the covered receiving bay.",
  ],
  [
    "Fold-flat shelving panels; matched rail bundles and labelled fitting cartons.",
    "Forklift unload by depot team only. Retain bundle labels until stock check is complete.",
  ],
  [
    "Recycled paper packaging; mixed carton sizes.",
    "Protect from rain; check shrink wrap before moving to the dry store.",
  ],
  [
    "Exhibition textiles; rolled fabric with reusable tubes and sample cards.",
    "No hooks. Keep rolls horizontal; call the receiving desk on arrival (no personal contact).",
  ],
  [
    "Workshop tool cases; foam inserts, empty cases and removable shelf dividers.",
    "Deliver after the morning stock count. Separate returnable pallets from loose cartons. Leave the reusable cases sealed for the receiving team's inventory check.",
  ],
] as const;

function consignments(route: number): readonly Consignment[] {
  return Object.freeze(
    Array.from({ length: 16 }, (_, index) => {
      const [goods, instructions] = freight[(index + route) % freight.length] ?? freight[0];
      return Object.freeze({
        id: `CN-${String(route * 16 + index + 1).padStart(3, "0")}`,
        destination: destinations[(index + route) % destinations.length] ?? destinations[0],
        goods,
        instructions,
        cartons: 2 + (index % 5),
        pallets: index % 3,
        cartonGrams: 3250 + (index % 4) * 750,
        palletGrams: 84500 + route * 10000 + (index % 3) * 5500,
        slot: ["08:00-09:30", "09:30-11:00", "11:00-12:30", "13:00-14:30"][index % 4] ?? "08:00-09:30",
        status: ["Staged", "Checked", "Hold: wrap", "Ready"][index % 4] ?? "Staged",
      });
    }),
  );
}

// Original fictional freight, fixed local date/time; no customer or personal data.
export const mockManifest: ManifestData = Object.freeze({
  number: "MF-DEMO-2026-0914",
  dispatched: "2026-09-14 / 07:30 depot local time (fixed mock clock)",
  depot: Object.freeze({
    name: "Bracken Loop Distribution (fictional)",
    lines: Object.freeze(["42 Model Wharf / Dispatch hall C", "Samplehaven SH0 2BL / mock site"]),
    contact: "dispatch@bracken.example.invalid",
  }),
  carrier: Object.freeze({
    name: "Lantern Freight Cooperative (fictional)",
    lines: Object.freeze(["6 Fictional Exchange / Cross-dock 3", "Mockbridge MB0 6LF / mock site"]),
    contact: "operations@lantern.example.invalid",
  }),
  routes: Object.freeze(
    ["Quayside circuit", "Workshop circuit", "Market circuit"].map((name, index) =>
      Object.freeze({ code: `R${index + 1}`, name, consignments: consignments(index) }),
    ),
  ),
});
