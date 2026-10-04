import { jsx } from "@updf/core/jsx-runtime";
import {
  type ContentDecoration,
  createDecorationPlan,
  type DecorationPlan,
  extension,
  type MeasureContext,
  type StaticDecoration,
} from "@updf/layout";
import { tableExtension } from "./adapter.js";
import { measureRow, paintRows } from "./measure.js";
import { deferredSection, Foot, Head } from "./parts.js";
import type { TableInput, TableSection } from "./types.js";

export function decorations(table: TableInput, context: MeasureContext): DecorationPlan | undefined {
  const staticEntries: StaticDecoration[] = [];
  const entries: ContentDecoration[] = [];
  for (const [edge, section] of [
    ["before", table.head],
    ["after", table.foot],
  ] as const) {
    if (!section) continue;
    const repeat = section.repeat ? "all" : edge === "before" ? "first" : "last";
    if (section.height !== undefined) {
      entries.push({ edge, repeat, height: section.height, content: sectionContent(table, section) });
      continue;
    }
    const measured = paintRows(
      section.rows.map((row, index) =>
        measureRow(row, table, context, `/props/${edge === "before" ? "head" : "foot"}/rows/${index}`),
      ),
      table,
      context,
    );
    if (measured.height) staticEntries.push({ edge, repeat, ...measured });
  }
  if (!entries.length) return staticEntries.length ? createDecorationPlan(staticEntries) : undefined;
  for (const entry of staticEntries)
    entries.push({
      edge: entry.edge,
      repeat: entry.repeat,
      height: entry.height,
      content: { type: "fixed", height: entry.height, children: entry.nodes },
    });
  return context.reserveDecorations(entries);
}
function sectionContent(table: TableInput, section: TableSection) {
  const content = deferredSection(section);
  return extension(tableExtension, {
    columns: table.columns,
    ...(content
      ? { children: jsx(table.head === section ? Head : Foot, { children: content }) }
      : { body: section.rows }),
    ...(table.style ? { style: table.style } : {}),
    ...(table.grid ? { grid: table.grid } : {}),
  });
}
