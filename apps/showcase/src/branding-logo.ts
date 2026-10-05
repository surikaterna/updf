import type { RGB } from "@updf/core";

export const brandPalettes = {
  ocean: { hex: "#176b78", rgb: [0.09, 0.42, 0.47] as RGB },
  plum: { hex: "#754368", rgb: [0.46, 0.26, 0.41] as RGB },
  ember: { hex: "#b45328", rgb: [0.71, 0.33, 0.16] as RGB },
};
export type BrandPalette = keyof typeof brandPalettes;

// Original sample artwork for this MIT-licensed project, not an official corporate mark.
export function brandingLogo(palette: BrandPalette): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
  <circle cx="40" cy="40" r="38" fill="${brandPalettes[palette].hex}"/>
  <path d="M40 10 L47 33 L70 40 L47 47 L40 70 L33 47 L10 40 L33 33 Z" fill="#ffffff"/>
  <circle cx="40" cy="40" r="6" fill="${brandPalettes[palette].hex}"/>
</svg>`;
}
