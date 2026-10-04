import { document, flow, paragraph, pt, span } from "@updf/layout";

export function inlineBackgroundProofDefinition() {
  return document({
    children: flow({
      pageSize: { width: 120, height: 160 },
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      children: paragraph({
        style: { font: "Demo", fontSize: 12, color: [1, 0, 0], lineHeight: pt(4) },
        whiteSpace: "preserve",
        breakLongWords: "codePoint",
        children: span({
          style: { backgroundColor: [1, 1, 0] },
          children: [
            "  A A A ",
            span({ style: { font: "Helvetica", fontSize: 14, backgroundColor: [0, 1, 1] }, children: "B B B\n\n" }),
            "C",
          ],
        }),
      }),
    }),
  });
}
