export interface CmrGoodsRow {
  readonly marks: string;
  readonly packages: string;
  readonly packing: string;
  readonly dimensions: string;
  readonly nature: string;
  readonly statistical: string;
  readonly weight: string;
  readonly volume: string;
}

/** Display data only, not a domain mapping or certified freight calculation. */
export interface CmrData {
  readonly sender: string;
  readonly terminal: string;
  readonly consignee: string;
  readonly shipment: string;
  readonly trip: string;
  readonly delivery: string;
  readonly carrier: string;
  readonly takingOver: string;
  readonly successiveCarriers: string;
  readonly attachedDocuments: string;
  readonly reservations: string;
  readonly goods: readonly CmrGoodsRow[];
  readonly totalWeight: string;
  readonly instructions: string;
  readonly payment: string;
  readonly liability: string;
  readonly conditions: string;
}
