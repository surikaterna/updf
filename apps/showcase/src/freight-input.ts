import type { FreightInvoiceData, FreightPreset } from "../../../examples/business/freight-invoice-data.js";

export interface FreightDraft {
  readonly buyer: string;
  readonly vehicle: string;
  readonly charges: readonly { readonly label: string; readonly net: string; readonly vat: string }[];
}

export function selectedFreightPreset(id: string): FreightPreset | undefined {
  if (id === "freight-invoice") return "original";
  if (id === "freight-invoice-extended") return "extended";
  if (id === "freight-invoice-multipage") return "multipage";
  return undefined;
}

/** Decimal text is converted without binary-float currency multiplication. */
function hundredths(value: string, signed: boolean, limit: number, label: string): number {
  const match = /^(?<sign>-?)(?<whole>\d{1,6})(?:\.(?<fraction>\d{1,2}))?$/u.exec(value);
  if (!match?.groups || (!signed && match.groups.sign))
    throw new Error(`${label}: use a decimal with at most two places`);
  const amount = Number(match.groups.whole) * 100 + Number((match.groups.fraction ?? "").padEnd(2, "0"));
  if (amount > limit) throw new Error(`${label}: maximum magnitude is ${limit / 100}`);
  return match.groups.sign ? -amount : amount;
}

function lines(value: string, label: string, maxLength: number, maxLines: number): readonly string[] {
  if (value.length > maxLength) throw new Error(`${label}: at most ${maxLength} characters`);
  const result = value
    .replaceAll("\r\n", "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!result.length || result.length > maxLines) throw new Error(`${label}: enter 1–${maxLines} nonempty lines`);
  return result;
}

export function freightInput(base: FreightInvoiceData, draft: FreightDraft): FreightInvoiceData {
  if (draft.charges.length < 1 || draft.charges.length > 20) throw new Error("Enter 1–20 charges");
  return {
    ...base,
    buyer: lines(draft.buyer, "Buyer", 600, 8),
    vehicle: lines(draft.vehicle, "Vehicle", 400, 6),
    charges: draft.charges.map((charge, index) => {
      if (!charge.label.trim() || charge.label.length > 200 || /[\r\n]/u.test(charge.label))
        throw new Error(`Charge ${index + 1}: description must be 1–200 characters on one line`);
      return {
        label: charge.label.trim(),
        netPence: hundredths(charge.net, true, 999999, `Charge ${index + 1} net GBP`),
        vatBasisPoints: hundredths(charge.vat, false, 10000, `Charge ${index + 1} VAT %`),
      };
    }),
  };
}
