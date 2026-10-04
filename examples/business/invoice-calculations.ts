import type { InvoiceData } from "./invoice-data.js";

function integer(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be nonnegative safe integer`);
  return value;
}
function rate(value: number): number {
  integer(value, "Basis points");
  if (value > 10000) throw new Error("Basis points must not exceed 10000");
  return value;
}
function roundedRate(cents: number, basisPoints: number): number {
  const numerator = integer(cents * rate(basisPoints), "Rate numerator");
  return Math.floor(integer(numerator + 5000, "Rounding numerator") / 10000);
}

// Example policy: invoice-level discount, then VAT on discounted goods + shipping.
// Round half-up once per discount/tax, in integer cents; not a library formula engine.
export function calculateInvoice(data: InvoiceData) {
  if (!data.items.length) throw new Error("Invoice requires line items");
  const lines = data.items.map((item) => {
    if (integer(item.quantity, "Quantity") === 0) throw new Error("Quantity must be positive");
    return integer(item.quantity * integer(item.unitCents, "Unit cents"), "Line cents");
  });
  const subtotalCents = lines.reduce((sum, cents) => integer(sum + cents, "Subtotal"), 0);
  const discountCents = roundedRate(subtotalCents, data.discountBasisPoints);
  const taxableCents = integer(subtotalCents - discountCents + integer(data.shippingCents, "Shipping"), "Taxable");
  const vatCents = roundedRate(taxableCents, data.vatBasisPoints);
  const grandTotalCents = integer(taxableCents + vatCents, "Grand total");
  if (grandTotalCents !== subtotalCents - discountCents + data.shippingCents + vatCents)
    throw new Error("Invoice does not reconcile");
  return { lines, subtotalCents, discountCents, taxableCents, vatCents, grandTotalCents };
}
export function money(cents: number): string {
  integer(cents, "Money");
  return `GBP ${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
