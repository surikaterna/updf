import { type DocumentDefinition, type NodeDefinition, type RichTextNode, render } from "@updf/core";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { jpeg, jpegProvider, prepareJpeg } from "@updf/jpeg";
import { createTextService } from "@updf/text";
import { type JpegControls, jpegDefaults, validateJpegControls } from "./jpeg-controls.js";

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

function placements(width: number, height: number): readonly NodeDefinition[] {
  const leaf = jpeg("sample", { x: 0, y: 0, width, height });
  return [
    caption("1. Aspect preserved by the example", 24, 110),
    jpeg("sample", { x: 24, y: 138, width, height }),
    caption("2. Explicit stretch (96pt high)", 264, 110),
    jpeg("sample", { x: 264, y: 138, width, height: 96 }),
    caption("3. Horizontal reflection", 24, 326),
    { type: "paintGroup", transform: [-1, 0, 0, 1, 24 + width, 354], children: [leaf] },
    caption("4. Explicit left-half clip", 264, 326),
    {
      type: "paintGroup",
      transform: [1, 0, 0, 1, 264, 354],
      clip: { x: 0, y: 0, width: width / 2, height },
      children: [leaf],
    },
  ];
}

export function jpegExample(source: Uint8Array, title: string, controls: JpegControls = jpegDefaults) {
  validateJpegControls(controls);
  if (title.length > 40 || /[\r\n]/u.test(title)) throw new Error("JPEG title must be one line, at most 40 characters");
  const sample = prepareJpeg(source);
  const { width: pixelWidth, height: pixelHeight, components } = sample.metadata;
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
            `${pixelWidth} x ${pixelHeight} source pixels; ${components === 1 ? "grayscale" : "JFIF color"}. Display width: ${controls.width} PDF points.`,
            24,
            68,
            432,
          ),
          ...placements(controls.width, height),
          caption(
            "One JPEG stream, four placements. Pixels do not set PDF size.\nClipping is not redaction. PNG and alpha are not supported.",
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
    providers: [jpegProvider(), fontProvider(runtime)],
    text: createTextService({ runtime, defaultFont: "Helvetica" }),
  });
  return { bytes, metadata: { pixelWidth, pixelHeight, components, placementCount: 4, pageCount: 1 } };
}
