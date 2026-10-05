import type { ProjectedPage, Projection } from "./projection.js";

const NS = "http://www.w3.org/2000/svg";
function svgElement(tag: string, attributes: Record<string, string | number>): SVGElement {
  const element = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

export function display(projection: Projection, selected: string, select: (id: string) => void): void {
  const canvas = document.querySelector("#canvas");
  const list = document.querySelector("#selection");
  if (!canvas || !list) throw new Error("Missing inspection host");
  canvas.replaceChildren(...projection.pages.map((page) => drawPage(page, selected, select)));
  const ids = new Map<string, string>();
  for (const page of projection.pages) {
    for (const rect of page.rectangles) ids.set(rect.id, `${rect.id} (${rect.path})`);
    for (const line of page.lines)
      ids.set(line.id, `${line.id}: ${line.line.fragments.map((f) => f.text).join("") || "blank line"}`);
  }
  list.replaceChildren(
    ...Array.from(ids, ([id, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.setAttribute("aria-pressed", String(selected === id));
      button.onclick = () => select(id);
      return button;
    }),
  );
  setText("#source", JSON.stringify(projection.snapshot.source, null, 2));
  displayMetadata(projection, selected);
}

function displayMetadata(projection: Projection, selected: string): void {
  setText(
    "#metadata",
    JSON.stringify(
      {
        status: projection.snapshot.status,
        selected,
        pages: projection.pages,
        counts: projection.snapshot.counts,
        blocked: projection.snapshot.blocked,
        regions: projection.snapshot.regions.map((region) => ({
          ...region,
          placements: region.placements.map(({ unit, ...position }) => ({
            ...position,
            id: unit.id,
            lineIndex: unit.lineIndex,
            rangeKind: unit.line ? "prepared-line-index (not UTF16)" : "atomic-unit",
            height: unit.height,
            boxCounts: unit.layout?.counts,
            boxes: unit.layout?.boxes,
          })),
        })),
        explanation:
          projection.snapshot.status === "blocked"
            ? "Next indivisible unit cannot fit this fresh region; stopped without retry."
            : projection.snapshot.status === "cap"
              ? "Page cap reached; accepted prefix is INCOMPLETE."
              : "Complete accepted snapshot.",
      },
      null,
      2,
    ),
  );
}

function drawPage(page: ProjectedPage, selected: string, select: (id: string) => void): SVGElement {
  const svg = svgElement("svg", {
    width: page.width,
    height: page.height,
    viewBox: `0 0 ${page.width} ${page.height}`,
    role: "img",
    "aria-label": `${page.id} accepted geometry`,
  });
  for (const rect of page.rectangles) {
    svg.append(...drawRect(rect, selected, select));
  }
  for (const line of page.lines) {
    const shape = svgElement("rect", {
      x: line.x,
      y: line.y,
      width: line.width,
      height: line.line.height,
      fill: selected === line.id ? "#ffdda480" : "none",
      stroke: "#708090",
      "stroke-dasharray": "1 3",
      "pointer-events": "all",
      "data-source": line.id,
    });
    shape.onclick = () => select(line.id);
    svg.append(shape);
    const text = svgElement("text", {
      x: line.x,
      y: line.y + line.line.baseline - line.line.top,
      "font-family": "Helvetica, Arial, sans-serif",
      "font-size": 14,
      "pointer-events": "none",
      "xml:space": "preserve",
    });
    text.textContent = line.line.fragments.map((fragment) => fragment.text).join("");
    svg.append(text);
  }
  return svg;
}

function drawRect(
  rect: ProjectedPage["rectangles"][number],
  selected: string,
  select: (id: string) => void,
): readonly SVGElement[] {
  const shape = svgElement("rect", {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    fill: selected === rect.id ? "#ffdda480" : "none",
    stroke: "#26518a",
    "pointer-events": "all",
    "data-source": rect.id,
  });
  shape.onclick = () => select(rect.id);
  const content = svgElement("rect", {
    ...rect.content,
    fill: "none",
    stroke: "#708090",
    "stroke-dasharray": "4 3",
    "pointer-events": "none",
  });
  return [shape, content];
}

export function setText(selector: string, text: string): void {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  element.textContent = text;
}
