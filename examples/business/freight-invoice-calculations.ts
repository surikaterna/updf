import type { FreightCharge } from "./freight-invoice-data.js";

// Application bound for a single atomic shipment, not a layout-engine limit.
export const MAX_FREIGHT_CHARGES = 20;
function safe(value: number): number {
  if (!Number.isSafeInteger(value)) throw new Error("Freight amounts must be safe integer pence");
  return value;
}
function tax(charge: FreightCharge): number {
  safe(charge.netPence);
  safe(charge.vatBasisPoints);
  if (charge.vatBasisPoints < 0 || charge.vatBasisPoints > 10000)
    throw new Error("VAT rate must be between 0 and 100%");
  const numerator = safe(safe(Math.abs(charge.netPence) * charge.vatBasisPoints) + 5000);
  return Math.sign(charge.netPence) * Math.floor(numerator / 10000);
}
export function calculateFreight(charges: readonly FreightCharge[]) {
  if (charges.length < 1 || charges.length > MAX_FREIGHT_CHARGES)
    throw new Error(`Freight requires 1 to ${MAX_FREIGHT_CHARGES} charges`);
  const taxes = charges.map((charge) => {
    const vat = tax(charge);
    safe(charge.netPence + vat);
    return vat;
  });
  const netPence = charges.reduce((sum, charge) => safe(sum + charge.netPence), 0);
  const vatPence = taxes.reduce((sum, value) => safe(sum + value), 0);
  return { taxes, netPence, vatPence, grossPence: safe(netPence + vatPence) };
}
export function freightMoney(pence: number): string {
  safe(pence);
  const magnitude = Math.abs(pence);
  return `${pence < 0 ? "-" : ""}£${Math.floor(magnitude / 100)}.${String(magnitude % 100).padStart(2, "0")}`;
}
