import { type DocumentDefinition, render, type TextNode } from "@updf/core";
import { measureText, type TextLineMeasurement } from "@updf/core/measurement";
import { PlaygroundError } from "./error.js";
import type { Projection } from "./projection.js";

export const FONT_SIZE = 14;
export const LINE_HEIGHT = 18;
export const MARGIN = 20;

export interface PreparedParagraph {
  readonly text: string;
  readonly width: number;
  readonly height: number;
  readonly lines: readonly TextLineMeasurement[];
}

export function prepareParagraph(text: string, width: number): PreparedParagraph {
  if (text.length > 8000 || /[^\x20-\x7e\n]/u.test(text)) {
    throw new PlaygroundError("CHARACTER", "/text", "use at most 8000 ASCII printable characters plus LF");
  }
  const measured = measureText({
    kind: "plain",
    text,
    width,
    font: "Helvetica",
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    align: "left",
  });
  return Object.freeze({ text, width, height: measured.consumedHeight, lines: measured.lines });
}

export interface AcceptedLine {
  readonly line: TextLineMeasurement;
  readonly x: number;
  readonly y: number;
  readonly width: number;
}

export function lowerLine(accepted: AcceptedLine): TextNode | undefined {
  const text = accepted.line.fragments.map((fragment) => fragment.text).join("");
  if (!text) return undefined;
  const check = prepareParagraph(text, accepted.width);
  const line = check.lines[0];
  if (
    check.lines.length !== 1 ||
    !line ||
    line.baseline + accepted.line.top !== accepted.line.baseline ||
    line.advance !== accepted.line.advance ||
    line.height !== accepted.line.height
  ) {
    throw new PlaygroundError("RECONSTRUCTION", "/line", "native fixed text changed measured geometry");
  }
  return Object.freeze({
    type: "text",
    text,
    x: accepted.x,
    y: accepted.y,
    width: accepted.width,
    height: accepted.line.height,
    font: "Helvetica",
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    align: "left",
  });
}

export function exportNative(document: DocumentDefinition): Uint8Array<ArrayBuffer> {
  return render(document);
}

export function exportProjection(projection: Projection): Uint8Array<ArrayBuffer> {
  if (projection.snapshot.status !== "done" || !projection.snapshot.pdf) {
    throw new PlaygroundError("INCOMPLETE", "/snapshot", "PDF download requires a complete PDF preset snapshot");
  }
  return exportNative({
    version: 1,
    pages: projection.pages.map((page) => ({
      width: page.width,
      height: page.height,
      children: [
        ...page.rectangles.map((rect) => ({
          type: "rect" as const,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          paint: { fill: null, stroke: [0.15, 0.3, 0.6] as const, width: 0.5 },
        })),
        ...page.lines.flatMap((line) => {
          const node = lowerLine(line);
          return node ? [node] : [];
        }),
      ],
    })),
  });
}
