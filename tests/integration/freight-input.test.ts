import assert from "node:assert/strict";
import test from "node:test";
import { freightInput, selectedFreightPreset, type FreightDraft } from "../../apps/showcase/src/freight-input.js";
import { mockFreightInvoice } from "../../examples/business/freight-invoice-data.js";

const draft: FreightDraft = {
  buyer: "Buyer\nAddress",
  vehicle: "Goods description",
  charges: [{ label: "Freight", net: "10.23", vat: "20" }],
};
test("freight editor maps decimal strings to exact signed pence and basis points without mutating presets", () => {
  const before = JSON.stringify(mockFreightInvoice);
  const result = freightInput(mockFreightInvoice, {
    ...draft,
    charges: [
      { label: "Freight", net: "10.23", vat: "17.50" },
      { label: "Credit", net: "-0.05", vat: "10.00" },
    ],
  });
  assert.deepEqual(result.charges, [
    { label: "Freight", netPence: 1023, vatBasisPoints: 1750 },
    { label: "Credit", netPence: -5, vatBasisPoints: 1000 },
  ]);
  assert.deepEqual(result.buyer, ["Buyer", "Address"]);
  assert.equal(JSON.stringify(mockFreightInvoice), before);
  assert.equal(selectedFreightPreset("freight-invoice-multipage"), "multipage");
  assert.equal(selectedFreightPreset("tables"), undefined);
});
test("freight editor rejects ambiguous amounts, excessive VAT and out-of-bound inputs", () => {
  for (const net of ["", "-", "NaN", "Infinity", "1e2", "0x10", "1,20", "+1", "1.234", "10000", " 1"])
    assert.throws(() => freightInput(mockFreightInvoice, { ...draft, charges: [{ label: "x", net, vat: "20" }] }));
  for (const vat of ["-1", "100.01", "20.001", "1e1"])
    assert.throws(() => freightInput(mockFreightInvoice, { ...draft, charges: [{ label: "x", net: "1", vat }] }));
  assert.throws(() => freightInput(mockFreightInvoice, { ...draft, charges: [] }));
  assert.throws(() => freightInput(mockFreightInvoice, { ...draft, charges: Array(21).fill(draft.charges[0]) }));
  assert.throws(() => freightInput(mockFreightInvoice, { ...draft, buyer: "\n  " }));
  assert.throws(() => freightInput(mockFreightInvoice, { ...draft, buyer: "b\n".repeat(9) }));
  assert.throws(() => freightInput(mockFreightInvoice, { ...draft, vehicle: "a".repeat(401) }));
  assert.throws(() => freightInput(mockFreightInvoice, { ...draft, charges: [{ label: "x\ny", net: "1", vat: "0" }] }));
});
