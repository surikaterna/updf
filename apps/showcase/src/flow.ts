import { render } from "@updf/core";
import { type FlowDocumentDefinition, layoutFlow } from "@updf/layout";

export interface FlowControls {
  readonly count: number;
  readonly preset: "compact" | "letter" | "overflow";
  readonly regions: boolean;
  readonly keepTogether: boolean;
}
export const flowDefaults: FlowControls = { count: 6, preset: "compact", regions: true, keepTogether: false };
export function flowDefinition(title: string, controls: FlowControls = flowDefaults): FlowDocumentDefinition {
  if (!Number.isInteger(controls.count) || controls.count < 1 || controls.count > 21)
    throw new Error("Paragraph count must be 1–21 (bounded showcase control, not a core limit)");
  if (!["compact", "letter", "overflow"].includes(controls.preset)) throw new Error("Unknown page preset");
  const region = (text: string) => ({
    height: 16,
    children: [
      {
        type: "text" as const,
        x: 0,
        y: 0,
        width: 180,
        height: 16,
        text,
        fontSize: 10,
        lineHeight: 16,
        align: "left" as const,
      },
    ],
  });
  return {
    pageTemplate: {
      width: controls.preset === "letter" ? 612 : 240,
      height: controls.preset === "letter" ? 792 : controls.preset === "overflow" ? 100 : 240,
      margins: { top: 16, right: 16, bottom: 16, left: 16 },
      ...(controls.regions
        ? { header: region("UPDF flow header"), footer: region("Repeated footer"), headerBodyGap: 8, bodyFooterGap: 8 }
        : {}),
    },
    body: Array.from({ length: controls.count }, (_, i) => ({
      type: "paragraph" as const,
      keepTogether: controls.keepTogether || controls.preset === "overflow",
      paragraph: {
        defaultStyle: { font: "Helvetica", fontSize: 12, color: [0, 0, 0] as const },
        lineHeight: 16,
        align: "left" as const,
        whiteSpace: "preserve" as const,
        breakLongWords: "codePoint" as const,
        runs: [
          {
            text: `${i + 1}. ${title}\nComplete measured lines.\nExplicit page template.\nNo clipping or shrinking.\nPortable PDF bytes.`,
          },
        ],
      },
    })),
  };
}
export function flowExample(title: string, controls: FlowControls = flowDefaults) {
  const result = layoutFlow(flowDefinition(title, controls));
  return { bytes: render(result.document), result };
}
