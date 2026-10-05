import { layoutBoxes } from "@updf/layout-kernel/boxes";
import type { FragmentPlacement, FragmentSource } from "@updf/layout-kernel/fragmentation";
import { type AsciiPiece, type ProofSource, proofFragments } from "./fragment-provider.js";

export function fragmentProof(twoRegions: boolean) {
  const text = "  alpha beta\n\n gamma delta  \n";
  const sources: readonly FragmentSource<ProofSource>[] = [
    {
      id: "row",
      path: "/row",
      descriptor: { kind: "row", height: atomicRowHeight() },
      extent: 1,
      mode: "atomic",
      width: { mode: "fixed", value: 8 },
    },
    {
      id: "text",
      path: "/text",
      descriptor: { kind: "ascii", text },
      extent: text.length,
      mode: "splittable",
      width: { mode: "reflow" },
    },
  ];
  const operation = proofFragments();
  const cursor = operation.start({ count: sources.length, at: (index) => sources[index]! });
  const first = operation.fragment(cursor, { id: "first", width: 8, height: twoRegions ? 4 : 20, usedHeight: 0 });
  const second = twoRegions
    ? operation.fragment(first.cursor, { id: "second", width: 5, height: 20, usedHeight: 0 })
    : undefined;
  const placements = Object.freeze([...first.placements, ...(second?.placements ?? [])]);
  const pieces = placements
    .filter((placement) => placement.sourceId === "text")
    .flatMap((placement) => placement.units.map((unit) => unit.content as AsciiPiece));
  if (pieces.map((piece) => piece.text).join("") !== text) throw new Error("Proof lost source coverage");
  if ((second ?? first).status !== "done") throw new Error("Proof did not finish");
  const counts = operation.counts();
  operation.close();
  return Object.freeze({ text, placements, counts });
}
function atomicRowHeight(): number {
  const children = [
    { id: "left", height: 2 },
    { id: "right", height: 1 },
  ];
  const root = { id: "row", height: 0 };
  const layout = layoutBoxes({
    root,
    width: 8,
    view: {
      id: (node) => node.id,
      path: (node) => `/${node.id}`,
      style: (node) => (node === root ? { flexDirection: "row" } : { width: 4, height: node.height }),
      childCount: (node) => (node === root ? children.length : 0),
      childAt: (_, index) => children[index]!,
      content: () => undefined,
    },
  });
  return layout.boxes[0]!.height;
}
export function geometrySummary(placements: readonly FragmentPlacement<unknown>[]) {
  return placements.map(({ sourceId, regionId, start, end, top, width, height }) => ({
    sourceId,
    regionId,
    start,
    end,
    top,
    width,
    height,
  }));
}
