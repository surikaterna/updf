import { type DocumentDefinition, render } from "@updf/core";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { createTextMeasurer, createTextService, measureText, type ParagraphDefinition } from "@updf/text";

export interface NoticeData {
  readonly reference: string;
  readonly issuedOn: string;
  readonly recipient: string;
  readonly message: string;
}

export const sampleNotice: NoticeData = Object.freeze({
  reference: "NOTICE-001",
  issuedOn: "2026-10-06",
  recipient: "Example Customer",
  message: "Your requested documents are ready. Please retain this notice for your records.",
});

function validateNotice(data: NoticeData): void {
  for (const key of ["reference", "issuedOn", "recipient", "message"] as const) {
    const value = data[key];
    if (typeof value !== "string" || !value.trim() || !/^[\x20-\x7e]+$/u.test(value)) {
      throw new TypeError(`${key} must be nonempty printable ASCII for this Helvetica template`);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(data.issuedOn)) {
    throw new TypeError("issuedOn must be a caller-validated date formatted YYYY-MM-DD");
  }
}

function paragraph(text: string, fontSize = 11): ParagraphDefinition {
  return {
    runs: [{ text }],
    defaultStyle: { font: "NoticeFont", fontSize, color: [0, 0, 0] },
    lineHeight: fontSize + 4,
    align: "left",
    whiteSpace: "preserve",
    breakLongWords: "error",
  };
}

export type MeasureNotice = (paragraphs: readonly ParagraphDefinition[], width: number) => number;

export function createNoticeDocument(data: NoticeData, measure: MeasureNotice): DocumentDefinition {
  validateNotice(data);
  const sections = [
    paragraph("Document notice", 18),
    paragraph(`Reference: ${data.reference}`),
    paragraph(`Issued: ${data.issuedOn}`),
    paragraph(`Recipient: ${data.recipient}`),
    paragraph(data.message),
  ];
  let y = 40;
  const children = sections.map((section) => {
    const paragraphs = [section];
    const height = measure(paragraphs, 515);
    if (y + height > 802) throw new RangeError("Notice exceeds its fixed page; use Flow for longer content");
    const node = { type: "richText" as const, x: 40, y, width: 515, height, paragraphs };
    y += height + 12;
    return node;
  });
  return { version: 1, pages: [{ width: 595, height: 842, children }] };
}

export function createNoticeRenderer() {
  const runtime = fontRuntime();
  const resources = { NoticeFont: createHelvetica() };
  const measurer = createTextMeasurer({ runtime });
  const options = {
    resources,
    text: createTextService({ runtime }),
    providers: [fontProvider(runtime)],
    profile: "service" as const,
  };
  const measure: MeasureNotice = (paragraphs, width) =>
    measureText({ width, paragraphs }, { resources, measurer, profile: "service" }).consumedHeight;
  return {
    document: (data: NoticeData) => createNoticeDocument(data, measure),
    render: (data: NoticeData): Uint8Array => render(createNoticeDocument(data, measure), options),
  };
}
