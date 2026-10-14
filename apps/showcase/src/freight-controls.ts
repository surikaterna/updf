import type { FreightCharge, FreightInvoiceData } from "../../../examples/business/freight-invoice-data.js";
import { freightInput, selectedFreightPreset } from "./freight-input.js";

function fields() {
  return {
    group: document.querySelector<HTMLFieldSetElement>("#freight-controls")!,
    buyer: document.querySelector<HTMLTextAreaElement>("#freight-buyer")!,
    vehicle: document.querySelector<HTMLTextAreaElement>("#freight-vehicle")!,
    charges: document.querySelector<HTMLElement>("#freight-charges")!,
    add: document.querySelector<HTMLButtonElement>("#freight-add-charge")!,
  };
}

let nextId = 0;
let revision = 0;
let active: { readonly id: string; readonly data: FreightInvoiceData } | undefined;
function input(label: string, name: string, value: string, maxLength: number): HTMLLabelElement {
  const wrapper = document.createElement("label");
  wrapper.textContent = label;
  const field = document.createElement("input");
  field.id = `freight-field-${nextId++}`;
  field.name = name;
  field.value = value;
  field.required = true;
  field.maxLength = maxLength;
  if (name !== "description") field.inputMode = "decimal";
  wrapper.htmlFor = field.id;
  wrapper.append(field);
  return wrapper;
}

function chargeRow(charge: FreightCharge): HTMLFieldSetElement {
  const row = document.createElement("fieldset");
  row.className = "freight-charge";
  row.append(document.createElement("legend"));
  row.append(input("Description", "description", charge.label, 200));
  row.append(input("Net GBP", "net", (charge.netPence / 100).toFixed(2), 9));
  row.append(input("VAT %", "vat", (charge.vatBasisPoints / 100).toFixed(2), 6));
  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Remove charge";
  remove.addEventListener("click", () => {
    row.remove();
    updateRows();
    fields().add.focus();
    fields().group.dispatchEvent(new Event("input", { bubbles: true }));
  });
  row.append(remove);
  return row;
}

function updateRows() {
  const { charges, add } = fields();
  const rows = Array.from(charges.querySelectorAll<HTMLFieldSetElement>(".freight-charge"));
  for (const [index, row] of rows.entries()) {
    row.querySelector("legend")!.textContent = `Charge ${index + 1}`;
    row.querySelector("button")!.disabled = rows.length === 1;
  }
  add.disabled = rows.length >= 20;
}

export async function showFreightControls(id: string): Promise<boolean> {
  const ticket = ++revision;
  active = undefined;
  const preset = selectedFreightPreset(id);
  const { group, buyer, vehicle, charges } = fields();
  group.hidden = !preset;
  group.disabled = true;
  if (!preset) return true;
  const { freightPreset } = await import("../../../examples/business/freight-invoice-data.js");
  if (ticket !== revision) return false;
  const data = freightPreset(preset);
  buyer.value = data.buyer.join("\n");
  vehicle.value = data.vehicle.join("\n");
  charges.replaceChildren(...data.charges.map(chargeRow));
  updateRows();
  active = { id, data };
  group.disabled = false;
  return true;
}

export function installFreightControls(): void {
  fields().add.addEventListener("click", () => {
    const { charges, group } = fields();
    if (charges.children.length >= 20) return;
    const row = chargeRow({ label: "Additional service", netPence: 0, vatBasisPoints: 2000 });
    charges.append(row);
    updateRows();
    row.querySelector("input")!.focus();
    group.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

export function freightControls(id: string) {
  const preset = selectedFreightPreset(id);
  if (!preset) return undefined;
  if (active?.id !== id) throw new Error("Freight inputs are loading; try again shortly");
  const { buyer, vehicle, charges } = fields();
  const values = Array.from(charges.querySelectorAll<HTMLFieldSetElement>(".freight-charge")).map((row) => {
    const value = (name: string) => row.querySelector<HTMLInputElement>(`[name="${name}"]`)!.value;
    return { label: value("description"), net: value("net"), vat: value("vat") };
  });
  return freightInput(active.data, { buyer: buyer.value, vehicle: vehicle.value, charges: values });
}
