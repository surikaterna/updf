import { type DocumentDefinition, type NodeDefinition, type RichTextNode, render } from "@updf/core";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { png, pngProvider, preparePng } from "@updf/png";
import { createTextService } from "@updf/text";
import { type PngControls, pngDefaults, validatePngControls } from "./png-controls.js";

function caption(text: string, x: number, y: number, width = 208, fontSize = 10): RichTextNode {
  return {
    type: "richText",
    x,
    y,
    width,
    height: 40,
    paragraphs: [
      {
        runs: [{ text }],
        defaultStyle: { font: "Helvetica", fontSize, color: [0.08, 0.16, 0.22] },
        lineHeight: fontSize + 4,
        align: "left",
        whiteSpace: "preserve",
        breakLongWords: "codePoint",
      },
    ],
  };
}

function background(x: number, y: number, width: number, height: number): NodeDefinition {
  return { type: "rect", x, y, width, height, paint: { fill: [0.2, 0.4, 0.8] } };
}

function placements(width: number, height: number): readonly NodeDefinition[] {
  const leaf = png("sample", { x: 0, y: 0, width, height });
  return [
    caption("1. Alpha over white paper", 24, 110),
    png("sample", { x: 24, y: 138, width, height }),
    caption("2. Same image over blue", 264, 110),
    background(264, 138, width, height),
    png("sample", { x: 264, y: 138, width, height }),
    caption("3. Reflected over blue", 24, 326),
    background(24, 354, width, height),
    { type: "paintGroup", transform: [-1, 0, 0, 1, 24 + width, 354], children: [leaf] },
    caption("4. Explicit left-half clip", 264, 326),
    background(264, 354, width, height),
    {
      type: "paintGroup",
      transform: [1, 0, 0, 1, 264, 354],
      clip: { x: 0, y: 0, width: width / 2, height },
      children: [leaf],
    },
  ];
}

export function pngExample(source: Uint8Array, title: string, controls: PngControls = pngDefaults) {
  validatePngControls(controls);
  if (title.length > 40 || /[\r\n]/u.test(title)) throw new Error("PNG title must be one line, at most 40 characters");
  const sample = preparePng(source);
  const { width: pixelWidth, height: pixelHeight, components, alpha } = sample.metadata;
  const height = (controls.width * pixelHeight) / pixelWidth;
  const document: DocumentDefinition = {
    version: 1,
    pages: [
      {
        width: 480,
        height: 600,
        children: [
          caption(title, 24, 20, 432, 16),
          caption(
            `${pixelWidth} x ${pixelHeight} source pixels; ${components === 1 ? "grayscale" : "color"} PNG with alpha. Display width: ${controls.width} PDF points.`,
            24,
            68,
            432,
          ),
          ...placements(controls.width, height),
          caption(
            "Opaque, half-transparent and clear quadrants. One image + mask,\nfour placements. Clipping is not redaction. No automatic DPI/fit.",
            24,
            530,
            432,
          ),
        ],
      },
    ],
  };
  const runtime = fontRuntime();
  const bytes = render(document, {
    resources: { sample, Helvetica: createHelvetica() },
    providers: [pngProvider(), fontProvider(runtime)],
    text: createTextService({ runtime, defaultFont: "Helvetica" }),
  });
  return { bytes, metadata: { pixelWidth, pixelHeight, components, alpha, placementCount: 4, pageCount: 1 } };
}
