import type { FreightCharge } from "./freight-invoice-data.js";

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
  if (charges.length !== 3) throw new Error("This single-shipment mock invoice requires exactly three charges");
  const taxes = charges.map(tax);
  const netPence = charges.reduce((sum, charge) => safe(sum + charge.netPence), 0);
  const vatPence = taxes.reduce((sum, value) => safe(sum + value), 0);
  return { taxes, netPence, vatPence, grossPence: safe(netPence + vatPence) };
}
export function freightMoney(pence: number): string {
  safe(pence);
  const magnitude = Math.abs(pence);
  return `${pence < 0 ? "-" : ""}£${Math.floor(magnitude / 100)}.${String(magnitude % 100).padStart(2, "0")}`;
}
