export interface FreightCharge {
  readonly label: string;
  readonly netPence: number;
  readonly vatBasisPoints: number;
}
export interface FreightInvoiceData {
  readonly number: string;
  readonly issued: string;
  readonly due: string;
  readonly buyer: readonly string[];
  readonly route: readonly string[];
  readonly vehicle: readonly string[];
  readonly shipment: readonly string[];
  readonly charges: readonly FreightCharge[];
}

export const mockFreightInvoice: FreightInvoiceData = Object.freeze({
  number: "MOCK-FI-046",
  issued: "12 SEP 2026",
  due: "12 OCT 2026",
  buyer: Object.freeze([
    "Copper Finch Logistics",
    "Mock dispatch house",
    "Meadow Quay, Demo City",
    "Fictional destination",
    "accounts@example.invalid",
  ]),
  route: Object.freeze([
    "MEADOW - LANTERN",
    "12 SEP 2026 06:30",
    "Vessel: Demo Tide",
    "Carrier: Copper Finch",
    "Reference: MOCK-TRIP",
  ]),
  vehicle: Object.freeze([
    "Driver: Demo operator",
    "Unit: accompanied",
    "Vehicle: MOCK-UNIT",
    "Trailer: MOCK-TRAILER",
    "Goods: display crates",
  ]),
  shipment: Object.freeze(["MOCK-SHIPMENT", "1 adult / laden", "Length: 15.6 m", "Net: 21,500 kg", "Gross: 34,000 kg"]),
  charges: Object.freeze([
    Object.freeze({ label: "Environment levy", netPence: 1635, vatBasisPoints: 0 }),
    Object.freeze({ label: "Freight passage", netPence: 21840, vatBasisPoints: 2000 }),
    Object.freeze({ label: "Energy fee", netPence: 3275, vatBasisPoints: 2000 }),
  ]),
});
