import { brandingLogo, type BrandPalette } from "./branding-logo.js";

export interface BrandingControls {
  logoSize: number;
  palette: BrandPalette;
}
export const brandingDefaults: BrandingControls = { logoSize: 56, palette: "ocean" };

export function validateBranding(controls: BrandingControls): BrandingControls {
  if (!Number.isInteger(controls.logoSize) || controls.logoSize < 32 || controls.logoSize > 80)
    throw new Error("Logo size must be an integer from 32 to 80 PDF points");
  if (!["ocean", "plum", "ember"].includes(controls.palette)) throw new Error("Unknown branding palette");
  return controls;
}

export function brandingControls(form: HTMLFormElement): BrandingControls {
  const data = new FormData(form);
  const palette = data.get("brandPalette");
  if (palette !== "ocean" && palette !== "plum" && palette !== "ember") throw new Error("Unknown branding palette");
  const controls = validateBranding({ logoSize: Number(data.get("brandLogoSize")), palette });
  showBrandLogo(palette);
  return controls;
}

export function showBrandLogo(palette: BrandPalette = "ocean"): void {
  const sample = document.getElementById("brand-logo");
  if (sample instanceof HTMLImageElement)
    sample.src = `data:image/svg+xml,${encodeURIComponent(brandingLogo(palette))}`;
}
