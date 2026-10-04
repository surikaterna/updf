import { layoutBoxes } from "@updf/layout-kernel/boxes";
import { type Controls, node, prepareBoxes, prepareRow, validateControls, view } from "./boxes.js";
import { type Snapshot, type Unit, unit } from "./snapshot.js";

export async function compute(c: Controls): Promise<Snapshot> {
  validateControls(c);
  if (c.preset === "boxes") {
    const prepared = prepareBoxes(c);
    const item = unit("root", { height: prepared.layout.boxes[0]?.height ?? 0, ...prepared });
    return finish([item], c, prepared.root);
  }
  const { prepareParagraph } = await import("./pdf.js");
  const paragraph = prepareParagraph(c.text, c.width);
  const row = prepareRow(c);
  const lines = paragraph.lines.map((line, lineIndex) =>
    unit(`line-${lineIndex}`, {
      height: line.height,
      line,
      lineIndex,
    }),
  );
  const atomic = unit("atomic-row", { height: row.layout.boxes[0]?.height ?? 0, ...row });
  const source = Object.freeze({ paragraph, atomic: row.root });
  if (c.paginate) return finish([...lines, atomic], c, source);
  return pdfCanvas(c, paragraph.height, row.root, lines, atomic, source);
}

function pdfCanvas(
  c: Controls,
  paragraphHeight: number,
  row: import("./boxes.js").SourceNode,
  lines: readonly Unit[],
  atomic: Unit,
  source: unknown,
): Snapshot {
  const root = node("document", { flexDirection: "column" }, [node("paragraph", { height: paragraphHeight }), row]);
  const placed = layoutBoxes({ root, view, width: c.width });
  const paragraphBox = placed.boxes.find((box) => box.id === "paragraph");
  const rowBox = placed.boxes.find((box) => box.id === "atomic-row");
  if (!paragraphBox || !rowBox) throw new Error("Missing B column placement");
  const placements = lines.map((item) =>
    Object.freeze({
      unit: item,
      x: paragraphBox.left,
      y: paragraphBox.top + (item.line?.top ?? 0),
      width: c.width,
      start: item.lineIndex ?? 0,
      end: (item.lineIndex ?? 0) + 1,
    }),
  );
  placements.push(Object.freeze({ unit: atomic, x: rowBox.left, y: rowBox.top, width: c.width, start: 0, end: 1 }));
  return Object.freeze({
    regions: Object.freeze([
      Object.freeze({
        id: "canvas",
        width: c.width,
        height: Math.max(c.height, placed.boxes[0]?.height ?? 0),
        placements: Object.freeze(placements),
      }),
    ]),
    source,
    pdf: true,
    status: "done",
  });
}

async function finish(units: readonly Unit[], c: Controls, source: unknown): Promise<Snapshot> {
  if (c.paginate) {
    const { paginate } = await import("./pagination.js");
    return paginate(units, c.width, c.height, c.pageCap, source, c.preset === "pdf");
  }
  const item = units[0];
  if (!item) throw new Error("Missing unit");
  return Object.freeze({
    regions: Object.freeze([
      Object.freeze({
        id: "canvas",
        width: c.width,
        height: Math.max(c.height, item.height),
        placements: Object.freeze([Object.freeze({ unit: item, x: 0, y: 0, width: c.width, start: 0, end: 1 })]),
      }),
    ]),
    source,
    pdf: false,
    status: "done",
  });
}
