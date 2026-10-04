export interface Address {
  readonly name: string;
  readonly lines: readonly string[];
  readonly contact: string;
}
export interface InvoiceItem {
  readonly code: string;
  readonly description: string;
  readonly quantity: number;
  readonly unit: string;
  readonly unitCents: number;
}
export interface InvoiceData {
  readonly number: string;
  readonly issued: string;
  readonly due: string;
  readonly reference: string;
  readonly seller: Address;
  readonly buyer: Address;
  readonly items: readonly InvoiceItem[];
  readonly discountBasisPoints: number;
  readonly vatBasisPoints: number;
  readonly shippingCents: number;
}

const catalogue: readonly [string, string, number, string][] = [
  ["CAB", "Braided USB-C cable, 2 m; recycled sleeve, graphite", 1295, "each"],
  ["HUB", "Four-port desktop hub; aluminium case, bus powered", 3890, "each"],
  ["STN", "Adjustable laptop stand; fold-flat hinges, slate finish", 4750, "each"],
  ["MAT", "Desk mat, 80 x 40 cm; washable felt with cork backing", 2495, "each"],
  ["CLP", "Cable clips, pack of 6; removable adhesive mounting", 875, "pack"],
  ["LMP", "Task lamp; warm-white dimmer, clamp mount included", 6850, "each"],
  ["TRY", "Stackable document tray; powder-coated steel, sand", 1875, "each"],
  ["ARM", "Monitor arm; single display, VESA mount and desk clamp", 8995, "each"],
  ["BAG", "Equipment pouch; padded recycled fabric, zip closure", 2290, "each"],
  ["PAD", "Notebook refill, dotted A5 paper; pack of 3", 1145, "pack"],
  ["LAB", "Writable equipment labels; sheet of 48, low-residue", 695, "sheet"],
  ["KIT", "Workstation setup service; cable routing and safety check", 9500, "hour"],
];

// Original fictional entities and fixed dates: never operational paperwork.
export const mockInvoice: InvoiceData = {
  number: "DEMO-2026-1042",
  issued: "2026-09-14",
  due: "2026-10-14",
  reference: "PO-DEMO-318 / Studio fit-out",
  seller: {
    name: "Morrow Deskworks (fictional)",
    lines: ["18 Lantern Walk", "Sampleford SF1 4MQ", "United Kingdom (mock address)"],
    contact: "accounts@morrow.example.invalid",
  },
  buyer: {
    name: "Juniper Workshop (fictional)",
    lines: ["Attn: Purchasing team", "7 Paper Lane", "Exampleton EX2 8JW, United Kingdom"],
    contact: "purchasing@juniper.example.invalid",
  },
  items: Array.from({ length: 36 }, (_, index) => {
    const item = catalogue[index % catalogue.length];
    if (!item) throw new Error("Missing mock catalogue item");
    const [code, description, unitCents, unit] = item;
    return {
      code: `${code}-${String(index + 1).padStart(3, "0")}`,
      description: `${description}. Delivery batch ${Math.floor(index / 12) + 1}.`,
      quantity: [2, 5, 3, 8, 4, 1, 6][index % 7] ?? 1,
      unit,
      unitCents,
    };
  }),
  discountBasisPoints: 500,
  vatBasisPoints: 2000,
  shippingCents: 2450,
};
