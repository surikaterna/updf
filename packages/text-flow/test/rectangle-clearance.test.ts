import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { DocumentError, render } from "@updf/core";
import { h } from "@updf/core/vdom";
import { layout, Document, Flow, Paragraph, Block, pt, type ContentLine } from "@updf/layout";
import { siblingOptions as options, siblingFlow as f } from "../../../tests/fixtures/text-flow/siblings.js";
import { protocolFixture } from "./sibling-protocol-fixture.js";
import { prepareFragmentPaint } from "../../layout/dist/cjs/fragment-paint-preparation.js";
import { collectPreparedLines } from "../../layout/dist/cjs/prepared-line-reports.js";
import { LayoutInputError } from "@updf/layout-boxes";

type Shape = "omitted" | "rect" | "path";
function visual(side: "left" | "right", shape: Shape, width = 200) {
  return h(
    f.Block,
    {
      style: {
        width,
        height: 36,
        float: side,
        ...(shape === "omitted" ? {} : { shapeOutside: shape === "rect" ? "rect" : `M0 0H${width}V36H0Z` }),
        backgroundColor: [0, 0, 1],
      },
    },
    "float",
  );
}
function paragraph(children: string, fontSize = 20) {
  return h(Paragraph, { style: { fontSize, lineHeight: pt(2), color: [1, 0, 0] }, children }, `p-${fontSize}`);
}
function run(children: unknown, height = 100) {
  return layout(
    h(Document, {
      children: h(Flow, {
        pageSize: { width: 200, height },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        participation: f.participation,
        children,
      } as never),
    }),
    options,
  );
}
function reports(fixture: ReturnType<typeof protocolFixture>) {
  const { state: _state, ...request } = fixture.request;
  const initial = fixture.block.fragment(request)!;
  const lines: ContentLine[] = [];
  collectPreparedLines(prepareFragmentPaint(initial, { x: 0, y: 0 }, request.budget, "/initial").root, lines);
  if (initial.nextOffset < fixture.block.extent) {
    const tail = fixture.block.fragment({ ...request, offset: initial.nextOffset, mode: "complete" })!;
    collectPreparedLines(prepareFragmentPaint(tail, { x: 0, y: initial.height }, request.budget, "/tail").root, lines);
  }
  return { initial, lines };
}
function nativeClearance(children: unknown) {
  const pdf = render(run(children).document, options);
  const text = execFileSync("pdftotext", ["-raw", "-", "-"], { input: pdf, encoding: "utf8" });
  assert.equal(text.replace(/\s/gu, ""), "AAAA");
  const ppm = execFileSync("pdftoppm", ["-r", "144", "-singlefile", "-"], { input: pdf });
  const header = /^P6\s+(\d+)\s+(\d+)\s+255\s/u.exec(ppm.toString("ascii", 0, 40))!;
  assert.ok(header);
  let inside = 0,
    red = 0,
    blue = 0;
  for (let y = 0; y < Number(header[2]); y++) {
    for (let x = 0; x < Number(header[1]); x++) {
      const at = header[0].length + 3 * (y * Number(header[1]) + x);
      if (ppm[at] === 0 && ppm[at + 1] === 0 && ppm[at + 2] === 255) blue++;
      if (ppm[at] !== 255 || ppm[at + 1] !== 0 || ppm[at + 2] !== 0) continue;
      red++;
      if (x > 2 && x < 398 && y > 2 && y < 71) inside++;
    }
  }
  assert.equal(inside, 0);
  assert.ok(red > 0 && blue > 1000);
}
for (const side of ["left", "right"] as const) {
  for (const shape of ["omitted", "rect", "path"] as const) {
    test(`${side}/${shape}: every later source clears, not merely the first tail paragraph`, () => {
      const fixture = protocolFixture([visual(side, shape), paragraph("A\nA\nA"), paragraph("A", 60)]);
      try {
        const { initial, lines } = reports(fixture);
        assert.ok(initial.height > 36);
        assert.equal(lines.length, 4);
        const later = lines.find((l) => l.fragments.some((p) => p.source.path.startsWith("/siblings/2")))!;
        assert.ok(later.top > 36);
        assert.ok(lines.every((l) => l.inkBounds.empty || l.inkBounds.top >= 36));
        assert.equal(
          lines
            .flatMap((l) => l.fragments)
            .filter((p) => p.role === "text")
            .map((p) => p.text)
            .join(""),
          "AAAA",
        );
        assert.equal(later.fragments[0]!.source.path, "/siblings/2/children");
        nativeClearance([visual(side, shape), paragraph("A\nA\nA"), paragraph("A", 60)]);
      } finally {
        fixture.close();
      }
    });
    test(`${side}/${shape}: rejected tight-page candidates do not adopt source progress`, () => {
      const fixture = protocolFixture([visual(side, shape), paragraph("A")]);
      try {
        const failed = fixture.request.state.fork();
        assert.equal(
          fixture.block.fragment({
            ...fixture.request,
            state: failed,
            availableHeight: 40,
            usedHeight: 60,
            atFreshRegion: false,
          }),
          undefined,
        );
        const first = fixture.block.fragment({ ...fixture.request, state: failed })!;
        const again = fixture.block.fragment({ ...fixture.request, state: fixture.request.state.fork() })!;
        assert.equal(first.nextOffset, 1);
        assert.equal(first.height, again.height);
        assert.equal(first.nextOffset, again.nextOffset);
        assert.ok(first.height > 40);
      } finally {
        fixture.close();
      }
      const result = run([h(Block, { style: { height: 60 }, children: null }), visual(side, shape), paragraph("A")]);
      assert.equal(result.placements[1]!.pageIndex, 1);
      assert.deepEqual(result.placements[1]!.sourceKeys, ["float"]);
      assert.equal(result.placements[2]!.box.width, 200);
      const text = execFileSync("pdftotext", ["-raw", "-", "-"], {
        input: render(result.document, options),
        encoding: "utf8",
      });
      assert.equal(text.replace(/\s/gu, ""), "A");
    });
  }
}
test("empty, whitespace and explicit breaks preserve source progress before a larger backwards-ink source", () => {
  for (const text of ["", "   ", "\n\n"]) {
    const fixture = protocolFixture([visual("left", "omitted"), paragraph(text), paragraph("A", 60)]);
    try {
      const { lines } = reports(fixture);
      assert.ok(lines.every((l) => l.inkBounds.empty || l.inkBounds.top >= 36));
      assert.equal(
        lines
          .flatMap((l) => l.fragments)
          .filter((p) => p.role === "text")
          .map((p) => p.text)
          .join("")
          .trim(),
        "A",
      );
    } finally {
      fixture.close();
    }
  }
});
test("a selected side prefix followed by a blocked word reserves clearance without consuming the word", () => {
  const fixture = protocolFixture([visual("left", "rect", 180), paragraph("A"), paragraph("indivisibleword")]);
  try {
    const { initial, lines } = reports(fixture);
    assert.ok(initial.nextOffset > 1 && initial.nextOffset < fixture.block.extent);
    assert.ok(initial.height > 36);
    assert.equal(lines[0]!.fragments[0]!.x, 180);
    const word = lines.find((l) => l.fragments.some((p) => p.role === "text" && p.text === "indivisibleword"))!;
    assert.equal(word.fragments[0]!.x, 0);
    assert.ok(word.inkBounds.empty || word.inkBounds.top >= 36);
    assert.equal(word.fragments[0]!.source.path, "/siblings/2/children");
  } finally {
    fixture.close();
  }
});
test("fresh-page oversize clearance fails native admission rather than painting or clipping", () => {
  assert.throws(
    () => run([visual("left", "omitted"), paragraph("A", 160)], 40),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]!.code === "LAYOUT_OVERSIZED",
  );
});
test("rejected forks retain every clearance lookahead charge without refunds", () => {
  const fixture = protocolFixture([visual("left", "rect", 100), paragraph("A"), paragraph("A", 60)]);
  const limit = (error: unknown) => error instanceof LayoutInputError && error.code === "LIMIT";
  try {
    let rejected = 0;
    assert.throws(() => {
      for (let i = 0; i < 10001; i++) {
        assert.equal(
          fixture.block.fragment({
            ...fixture.request,
            usedHeight: 99,
            availableHeight: 1,
            atFreshRegion: false,
            state: fixture.request.state.fork(),
          }),
          undefined,
        );
        rejected++;
      }
    }, limit);
    assert.ok(rejected > 1);
    assert.throws(() => fixture.block.fragment({ ...fixture.request, state: fixture.request.state.fork() }), /closed/u);
  } finally {
    fixture.close();
  }
});
