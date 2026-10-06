import type { NodeDefinition, RGB, RichTextNode } from "@updf/core";
import { compileSVG } from "@updf/svg";
import { type BrandingControls, brandingDefaults, validateBranding } from "./branding-controls.js";
import { brandingLogo, brandPalettes } from "./branding-logo.js";
import { render } from "./text-options.js";

function text(text: string, x: number, y: number, width: number, fontSize = 11): RichTextNode {
  return {
    type: "richText",
    x,
    y,
    width,
    height: fontSize * 1.5,
    paragraphs: [
      {
        runs: [{ text }],
        defaultStyle: { font: "Helvetica", fontSize, color: [0, 0, 0] },
        lineHeight: fontSize * 1.5,
        align: "left",
        whiteSpace: "preserve",
        breakLongWords: "error",
      },
    ],
  };
}

function rule(y: number, color: RGB): NodeDefinition {
  return { type: "rect", x: 48, y, width: 516, height: 2, paint: { fill: color, stroke: null } };
}

function logo(x: number, y: number, size: number, controls: BrandingControls): NodeDefinition {
  const compiled = compileSVG(brandingLogo(controls.palette), { x, y, w: size, h: size });
  if (compiled.diagnostics.length) throw new Error("Trusted branding SVG must compile without diagnostics");
  return compiled.node;
}

function header(controls: BrandingControls): NodeDefinition[] {
  return [
    logo(48, 42, controls.logoSize, controls),
    text("NORTHSTAR", 148, 48, 300, 21),
    text("STUDIO / DESIGN & DIRECTION", 149, 82, 340, 10),
    rule(140, brandPalettes[controls.palette].rgb),
  ];
}

function body(title: string, controls: BrandingControls): NodeDefinition[] {
  return [
    text("PROJECT NOTE / 001", 48, 176, 516, 10),
    // The smaller long-title preset fits even 40 widest printable Helvetica characters.
    text(title, 48, 208, 516, title.length > 27 ? 13 : 20),
    text("A clear direction. A thoughtful delivery.", 48, 257, 516, 14),
    text("Hello from Northstar Studio,", 48, 321, 516),
    text("This sample letterhead brings a small identity system to the page:", 48, 353, 516),
    text("a vector mark, a restrained palette and space for your message.", 48, 373, 516),
    text("The logo stays sharp at every size. Change the controls to explore", 48, 409, 516),
    text("the same original artwork in a different scale or color direction.", 48, 429, 516),
    { type: "rect", x: 48, y: 492, width: 516, height: 104, paint: { fill: [0.96, 0.96, 0.94], stroke: null } },
    logo(68, 514, 56, controls),
    text("Made to make an impression.", 144, 514, 390, 16),
    text("Vector SVG / native PDF paths / no raster images", 144, 546, 390, 10),
    text("Warm regards,", 48, 636, 516),
    text("The Northstar team", 48, 660, 516, 13),
  ];
}

function footer(controls: BrandingControls): NodeDefinition[] {
  return [
    rule(718, brandPalettes[controls.palette].rgb),
    text("NORTHSTAR STUDIO / ORIGINAL SAMPLE IDENTITY", 48, 735, 516, 9),
    text("Not official corporate branding. Fictional correspondence. Page 1 / 1", 48, 753, 516, 9),
  ];
}

export function brandingDemo(title: string, controls: BrandingControls = brandingDefaults): Uint8Array {
  validateBranding(controls);
  if (title.length > 40) throw new Error("Title must be at most 40 characters");
  return render({
    version: 1,
    pages: [
      { width: 612, height: 792, children: [...header(controls), ...body(title, controls), ...footer(controls)] },
    ],
  });
}
