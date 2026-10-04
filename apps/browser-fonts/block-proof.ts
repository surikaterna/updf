import { render } from "@updf/core";
import { block, document as createDocument, createExtensions, flow, layout } from "@updf/layout";
import { chart, chartAdapter } from "../../tests/fixtures/chart.js";
import { blockDefaults, blockExample } from "../showcase/src/blocks.js";

export function blockProof() {
  const result = layout(
    createDocument({
      children: flow({
        pageSize: { width: 200, height: 100 },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        children: [block({ children: [], style: { height: 50 } }), chart({ height: 60, values: [0.2, 0.6, 0.9] })],
        extensions: createExtensions([chartAdapter]),
      }),
    }),
  );
  return { bytes: render(result.document), result };
}

export function mountBlockProof(): void {
  mount(blockProof(), "external-chart", "Download external chart proof");
  mount(containerProof(), "container-clip", "Download container clip proof");
}
export function containerProof() {
  return blockExample("Browser C proof", { ...blockDefaults, blockHeight: 48, hidden: true });
}
function mount(
  proof: ReturnType<typeof blockProof> | ReturnType<typeof containerProof>,
  name: string,
  label: string,
): void {
  const url = URL.createObjectURL(new Blob([proof.bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}-browser.pdf`;
  link.textContent = label;
  document.body.append(link);
  const result = document.createElement("pre");
  result.id = `${name}-result`;
  result.textContent = JSON.stringify(proof.result);
  result.hidden = true;
  document.body.append(result);
  window.addEventListener("pagehide", () => URL.revokeObjectURL(url), { once: true });
}
