import { h } from "@updf/core/vdom";
import { Block, block, document, flow, flowFooter, flowHeader, paragraph } from "@updf/layout";

export function autoMarginProofDefinition() {
  return document({
    children: flow({
      pageSize: { width: 120, height: 160 },
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
      children: [
        flowHeader({ height: 12, children: [] }),
        block({ style: { height: 30 }, children: [] }),
        h(Block, {
          keepTogether: true,
          style: { marginTop: "auto", height: 20 },
          children: paragraph({ style: { fontSize: 10, lineHeight: 1 }, children: "SUMMARY" }),
        }),
        flowFooter({ height: 18, children: [] }),
      ],
    }),
  });
}

export function autoMarginProofFailures() {
  return [undefined, null, 10, "bad"].map((marginTop) =>
    document({
      children: flow({
        pageSize: { width: 120, height: 160 },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        children: h(Block, { keepTogether: true, style: { marginTop } as never, children: [] }),
      }),
    }),
  );
}

export function assertAutoMarginProof(result: { placements: readonly { box: { y: number; height: number } }[] }): void {
  if (result.placements[1]?.box.y !== 112 || result.placements[1]?.box.height !== 20)
    throw new Error("Expected terminal outer box at 112");
}
