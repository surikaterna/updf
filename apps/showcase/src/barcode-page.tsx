/** @jsxImportSource @updf/core */
import type { VNode } from "@updf/core/vdom";
import { lower, render } from "./text-options.js";

function caption(text: string, y: number, fontSize = 11): VNode {
  return (
    <richText
      x={24}
      y={y}
      width={432}
      height={48}
      paragraphs={[
        {
          runs: [{ text }],
          defaultStyle: { font: "Helvetica", fontSize, color: [0.08, 0.16, 0.22] },
          lineHeight: fontSize + 4,
          align: "left",
          whiteSpace: "preserve",
          breakLongWords: "codePoint",
        },
      ]}
    />
  );
}

export function barcodePage(title: string, subtitle: string, barcode: VNode): Uint8Array {
  if (title.length > 40 || /[\r\n]/u.test(title))
    throw new Error("Barcode title must be one line, at most 40 characters");
  return render(
    lower(
      <document version={1}>
        <page width={480} height={600}>
          {caption(title, 24, 18)}
          {caption(subtitle, 78)}
          {barcode}
          {caption(
            "Vector PDF, not a bitmap. Keep the quiet zone clear.\nNo automatic shrinking; scanner/printer compatibility is not guaranteed.",
            546,
            9,
          )}
        </page>
      </document>,
    ),
  );
}
