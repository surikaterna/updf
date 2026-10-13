export interface Code39Controls {
  readonly kind: "code39";
  readonly value: string;
  readonly moduleWidth: number;
  readonly barHeight: number;
  readonly wideRatio: 2 | 3;
  readonly checksum: "none" | "mod43";
}
export interface QrControls {
  readonly kind: "qr";
  readonly value: string;
  readonly moduleSize: number;
  readonly errorCorrection: "M" | "H";
}
export type BarcodeControls = Code39Controls | QrControls;
export const code39Defaults: Code39Controls = Object.freeze({
  kind: "code39",
  value: "SHIP-12345",
  moduleWidth: 1,
  barHeight: 64,
  wideRatio: 3,
  checksum: "none",
});
export const qrDefaults: QrControls = Object.freeze({
  kind: "qr",
  value: "https://example.com/ship/12345",
  moduleSize: 3,
  errorCorrection: "M",
});

export function validateBarcodeControls(value: BarcodeControls): void {
  if (value.kind === "code39") {
    if (!Number.isFinite(value.moduleWidth) || value.moduleWidth < 0.25 || value.moduleWidth > 4)
      throw new Error("Code 39 module width must be 0.25–4 points");
    if (!Number.isFinite(value.barHeight) || value.barHeight < 16 || value.barHeight > 180)
      throw new Error("Code 39 bar height must be 16–180 points");
    if (value.wideRatio !== 2 && value.wideRatio !== 3) throw new Error("Select ratio 2 or 3");
    if (value.checksum !== "none" && value.checksum !== "mod43") throw new Error("Select none or Mod-43");
    return;
  }
  if (value.kind !== "qr") throw new Error("Unknown barcode demo");
  if (!Number.isFinite(value.moduleSize) || value.moduleSize < 0.5 || value.moduleSize > 6)
    throw new Error("QR module size must be 0.5–6 points");
  if (value.errorCorrection !== "M" && value.errorCorrection !== "H") throw new Error("Select correction M or H");
}

export function barcodeControls(form: HTMLFormElement, kind: "code39" | "qr"): BarcodeControls {
  const input = (id: string) => form.querySelector<HTMLInputElement>(`#${id}`)!;
  const select = (id: string) => form.querySelector<HTMLSelectElement>(`#${id}`)!.value;
  const controls =
    kind === "code39"
      ? {
          kind,
          value: input("code39-value").value,
          moduleWidth: input("code39-module").valueAsNumber,
          barHeight: input("code39-height").valueAsNumber,
          wideRatio: Number(select("code39-ratio")) as 2 | 3,
          checksum: select("code39-checksum") as "none" | "mod43",
        }
      : {
          kind,
          value: input("qr-value").value,
          moduleSize: input("qr-module").valueAsNumber,
          errorCorrection: select("qr-correction") as "M" | "H",
        };
  validateBarcodeControls(controls);
  return controls;
}
