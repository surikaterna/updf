import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { type DocumentDefinition, DocumentError, type PathCommand, render, renderUnknown } from "@updf/core";
import { paint } from "@updf/core/internal";
import { h, lower } from "@updf/core/vdom";
import { cmrFixture, createCmrDocument } from "@updf/example-cmr/cmr";
import { createUnicodeCmrDocument } from "@updf/example-cmr/cmr-unicode";
import { prepareFont } from "@updf/fontkit";
import { paintingDocument } from "../../apps/node/src/painting-document.js";

const document = (children: DocumentDefinition["pages"][number]["children"]): DocumentDefinition => ({
  version: 1,
  pages: [{ width: 100, height: 100, children }],
});
const curve: readonly PathCommand[] = Object.freeze([
  { type: "move", x: 10, y: 10 },
  { type: "cubic", x1: -10, y1: 10, x2: 110, y2: 90, x: 90, y: 90 },
]);

test("true cubic extrema after affine, not control polygon, and singular/overflow rejection", () => {
  assert.ok(render(document([{ type: "path", commands: curve }])).length);
  assert.ok(render(document([{ type: "path", commands: curve, transform: [-1, 0, 0, 1, 100, 0] }])).length);
  assert.throws(
    () => render(document([{ type: "path", commands: curve, transform: [1, 0, 0, 0, 0, 0] }])),
    DocumentError,
  );
  assert.throws(
    () => render(document([{ type: "path", commands: curve, transform: [1e308, 0, 0, 1e308, 0, 0] }])),
    DocumentError,
  );
  assert.throws(
    () =>
      render(
        document([
          {
            type: "path",
            commands: [
              { type: "move", x: 0, y: 0 },
              { type: "line", x: 101, y: 1 },
            ],
          },
        ]),
      ),
    DocumentError,
  );
});

test("bounded local clip permits outside geometry; recursive immutable containers and cycle limits", () => {
  const input = document([
    {
      type: "paintGroup",
      clip: { x: 10, y: 10, width: 50, height: 50 },
      children: [{ type: "rect", x: -100, y: -100, width: 300, height: 300, paint: { fill: [1, 0, 0], stroke: null } }],
    },
  ]);
  const json = JSON.stringify(input);
  assert.deepEqual(renderUnknown(JSON.parse(json)), render(input));
  assert.equal(JSON.stringify(input), json);
  assert.throws(
    () => render(document([{ type: "paintGroup", clip: { x: -1, y: 0, width: 10, height: 10 }, children: [] }])),
    DocumentError,
  );
  const group: Record<string, unknown> = { type: "paintGroup", children: [] };
  group.children = [group];
  assert.throws(
    () => renderUnknown({ version: 1, pages: [{ width: 100, height: 100, children: [group] }] }),
    DocumentError,
  );
});

test("paint/dash invariants, width zero disables stroke, alpha only allocated when used", () => {
  const normalized = paint({ dash: [3, 2, 1], dashOffset: -1 }, "path", "/paint");
  assert.deepEqual(normalized.dash, [3, 2, 1, 3, 2, 1]);
  assert.equal(normalized.dashOffset, 11);
  for (const bad of [
    { dash: [0, 0] },
    { dash: [-1] },
    { width: -1 },
    { fill: [1, 2, 0] },
    { fillOpacity: Infinity },
    { lineCap: "bad" },
  ]) {
    assert.throws(() => paint(bad, "path", "/paint"), DocumentError);
  }
  const bytes = render(
    document([{ type: "line", x: 10, y: 10, x2: 90, y2: 90, paint: { width: 0, strokeOpacity: 0.5 } }]),
  );
  const raw = Buffer.from(bytes).toString("latin1");
  assert.ok(!/^0 w$/m.test(raw) && !raw.includes("/ExtGState"));
  assert.ok(raw.includes("n\nQ"));
  assert.throws(
    () =>
      renderUnknown({
        version: 1,
        pages: [{ width: 100, height: 100, children: [{ type: "path", commands: "q raw PDF" }] }],
      }),
    DocumentError,
  );
});

test("typed native VDOM path/container matches AST and translation composes outside node matrix", () => {
  const node = h("document", {
    version: 1,
    children: h("page", {
      width: 100,
      height: 100,
      children: h("group", {
        x: 10,
        y: 20,
        children: h("paintGroup", {
          clip: { x: 0, y: 0, width: 50, height: 50 },
          children: h("path", { commands: curve, transform: [0.5, 0, 0, 0.5, 0, 0] }),
        }),
      }),
    }),
  });
  const ast = lower(node);
  assert.deepEqual(
    render(ast),
    render(
      document([
        {
          type: "paintGroup",
          transform: [1, 0, 0, 1, 10, 20],
          clip: { x: 0, y: 0, width: 50, height: 50 },
          children: [{ type: "path", commands: curve, transform: [0.5, 0, 0, 0.5, 0, 0] }],
        },
      ]),
    ),
  );
});

function recursiveFontDocument() {
  return document([
    {
      type: "paintGroup",
      transform: [1, 0, 0, 1, 10, 10],
      children: [
        {
          type: "text",
          x: 0,
          y: 0,
          width: 70,
          height: 20,
          text: "Москва",
          font: "Demo",
          fontSize: 10,
          lineHeight: 12,
          align: "left",
        },
        {
          type: "rect",
          x: 20,
          y: 30,
          width: 20,
          height: 20,
          paint: { fill: [1, 0, 0], stroke: null, fillOpacity: 0.4 },
        },
      ],
    },
  ]);
}

test("recursive groups collect embedded fonts and alpha resources without shifting default CMR digests", async () => {
  const font = prepareFont(
    new Uint8Array(await readFile(new URL("../fixtures/fonts/LiberationSans-Regular.ttf", import.meta.url))),
  );
  const ast = recursiveFontDocument();
  const directory = await mkdtemp(join(tmpdir(), "paint-font-"));
  try {
    const path = join(directory, "font.pdf");
    await writeFile(path, render(ast, { resources: { Demo: font } }));
    execFileSync("qpdf", ["--check", path]);
    assert.ok(execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" }).includes("Москва"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
  const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
  assert.equal(
    digest(render(createCmrDocument(cmrFixture))),
    "8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22",
  );
  assert.equal(
    digest(render(createUnicodeCmrDocument(font), { resources: { CmrFont: font } })),
    "cea1742abcfd3a21d2ebe6162967e9e4a9867653aee294cbf26bd658deca23e4",
  );
});

test("independent Poppler painting raster checks evenodd/nonzero, separate alpha, clip and sibling isolation", async () => {
  const bytes = render(paintingDocument);
  const raw = Buffer.from(bytes).toString("latin1");
  assert.equal((raw.match(/^q$/gm) ?? []).length, (raw.match(/^Q$/gm) ?? []).length);
  assert.ok(raw.includes("/ca 0.5 /CA 1") && raw.includes("/ca 1 /CA 0.25"));
  assert.ok(raw.includes("f*") && raw.includes("[3 2 1 3 2 1] 11 d"));
  const directory = await mkdtemp(join(tmpdir(), "painting-"));
  try {
    const path = join(directory, "painting.pdf");
    await writeFile(path, bytes);
    execFileSync("qpdf", ["--check", path]);
    assert.ok(execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" }).includes("TEXT"));
    execFileSync("pdftoppm", ["-r", "72", "-singlefile", path, join(directory, "raster")]);
    const image = await readFile(join(directory, "raster.ppm"));
    const header = image.toString("ascii", 0, 100).match(/^P6\s+300\s+300\s+255\s/);
    assert.ok(header);
    const rgb = (x: number, y: number) =>
      Array.from(image.subarray(header[0].length + (y * 300 + x) * 3, header[0].length + (y * 300 + x) * 3 + 3));
    assert.deepEqual(rgb(90, 30), [0, 255, 0]);
    assert.deepEqual(rgb(180, 60), [255, 255, 255]);
    assert.deepEqual(rgb(180, 160), [255, 128, 0]);
    assert.deepEqual(rgb(150, 30), [0, 0, 255]);
    const red = rgb(30, 30);
    assert.equal(red[0], 255);
    assert.ok((red[1] ?? 0) >= 126 && (red[1] ?? 0) <= 128);
    assert.deepEqual(rgb(70, 160), [0, 0, 0]);
    assert.deepEqual(rgb(5, 160), [255, 255, 255]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
