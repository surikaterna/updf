import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { prepareFont } from "@updf/fontkite";
import { readCached, cacheRoot } from "./cache.js";
import { cubicTrace, directQuadratic, pathFactory, probeFont, segments, singleAxisPath } from "./fontkit-probe.js";
import { coordinate, type SerializedCommand } from "./path-commands.js";
import { corpus } from "./manifest.js";

interface ExactRow {
  id: string;
  codePoint: number;
  glyphId: number;
  sha256: string;
  fontkite: readonly number[];
  fontkit: readonly number[];
  exactRounded: readonly number[];
  extrema: readonly { value: string; t?: string; coordinates?: readonly string[] }[];
  witnesses: readonly (readonly { value: string; t: string; coordinates: readonly string[] }[])[];
  commands: readonly SerializedCommand[];
}
const source = new URL("../../artifacts/font-corpus/exact-analysis.json", import.meta.url);
const report: { rows: readonly ExactRow[] } = JSON.parse(await readFile(source, "utf8"));
const traces = [];
for (const row of report.rows) {
  const item = corpus.find((font) => font.id === row.id);
  assert.ok(item);
  assert.equal(item.font.sha256, row.sha256);
  const bytes = await readCached(cacheRoot(), item.font);
  const font = probeFont(bytes);
  const prepared = prepareFont(bytes).metadata.glyphs.find((glyph) => glyph.codePoint === row.codePoint);
  assert.ok(prepared);
  assert.equal(prepared.glyphId, row.glyphId);
  assert.deepEqual(prepared.bounds, row.exactRounded, `Current Fontkite bounds: ${row.id}/${row.codePoint}`);
  const actualBox = font.getGlyph(row.glyphId).path.bbox;
  assert.deepEqual(
    [Math.floor(actualBox.minX), Math.floor(actualBox.minY), Math.ceil(actualBox.maxX), Math.ceil(actualBox.maxY)],
    row.fontkit,
  );
  assert.deepEqual(
    segments(font.getGlyph(row.glyphId).path.commands),
    segments(row.commands),
    `Path geometry: ${row.id}/${row.codePoint}`,
  );
  for (let edge = 0; edge < 4; edge++) {
    if (row.fontkite[edge] === row.fontkit[edge]) continue;
    const round = edge < 2 ? Math.floor : Math.ceil;
    const candidates = row.witnesses[edge]!.map((extremum) => {
      const points = extremum.coordinates.map(coordinate);
      const path = singleAxisPath(pathFactory(font), points);
      return {
        extremum,
        points,
        fontkit: edge < 2 ? path.bbox.minX : path.bbox.maxX,
        fontkite: directQuadratic(points[0]!, points[1]!, points[2]!),
      };
    });
    const found = candidates.find(({ fontkit }) => round(fontkit) === row.fontkit[edge]);
    assert.ok(found, `Isolated witness: ${row.id}/${row.codePoint}`);
    const { extremum, points, fontkit, fontkite } = found;
    const cubic = cubicTrace(points[0]!, points[1]!, points[2]!);
    const cause =
      prepared.bounds[edge] === row.fontkit[edge]
        ? "resolved-fontkite-roundoff"
        : cubic.a !== 0
          ? "fontkit-root-cancellation"
          : "fontkit-evaluation-roundoff";
    traces.push({
      id: row.id,
      codePoint: row.codePoint,
      edge,
      cause,
      points,
      exact: extremum.value,
      t: extremum.t,
      bernsteinEvaluation: fontkite,
      fontkit,
      bernsteinRounded: round(fontkite),
      currentKite: prepared.bounds[edge],
      roundedKit: round(fontkit),
      exactRounded: row.exactRounded[edge],
      cubic,
    });
  }
}
await writeFile(
  new URL("../../artifacts/font-corpus/discrepancy-traces.json", import.meta.url),
  `${JSON.stringify(traces, null, 2)}\n`,
);
console.table(traces.map(({ cubic, ...trace }) => ({ ...trace, a: cubic.a, roots: cubic.roots.join(", ") })));
