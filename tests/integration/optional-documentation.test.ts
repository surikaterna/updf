import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SVGError, compileSVG, renderSVG } from "@updf/svg";
import { allocateAndPaint, compilePainting, prepareTrustedFont, svgTarget } from "./optional-documentation-examples.js";

test("documented allocation and geometry contracts match runtime", () => {
  const { allocation, commands, color } = allocateAndPaint();
  assert.deepEqual(allocation.widths, [20, 59]);
  assert.ok(Object.isFrozen(allocation));
  assert.ok(Object.isFrozen(allocation.widths));
  assert.equal(commands.at(-1)?.type, "close");
  assert.deepEqual(color.rgb, [1, 0, 0]);
  assert.equal(color.opacity, 128 / 255);
  assert.equal(Object.isFrozen(color), false);
});

test("documented SVG example compiles painting and native VDOM with viewport clipping", () => {
  const { painting, tree } = compilePainting();
  assert.deepEqual(painting.clip, { x: 0, y: 0, width: 100, height: 100 });
  assert.ok(Object.isFrozen(painting));
  assert.ok(Object.isFrozen(tree));
  const empty = compileSVG('<svg viewBox="0 0 10 10"/>', svgTarget);
  assert.ok(Object.isFrozen(empty.diagnostics));
  assert.throws(() => compileSVG("<svg/>", { ...svgTarget, w: 0 }), SVGError);
  assert.throws(() => renderSVG("<svg><text>Not supported</text></svg>", svgTarget), SVGError);
});

test("documented optional font loading prepares trusted fixture bytes", async () => {
  const bytes = new Uint8Array(
    await readFile(new URL("../fixtures/fonts/LiberationSans-Regular.ttf", import.meta.url)),
  );
  const font = await prepareTrustedFont(bytes);
  assert.ok(Object.isFrozen(font.metadata));
  const length = font.metadata.byteLength;
  bytes.fill(0);
  assert.equal(font.metadata.byteLength, length);
  assert.ok(length > 0);
});

test("optional defining contracts survive ESM and canonical CJS declaration emission", async () => {
  const contracts = [
    ["layout-kernel", "width-resolver", "residual ULPs are assigned in stable input order"],
    ["geometry", "arc", "Readonly typing does not imply freezing"],
    ["geometry", "color", "Not runtime-frozen"],
    ["svg", "index", "no redaction"],
    ["svg", "types", "half-open UTF-16 offsets"],
    ["svg", "tree", "warning-free contract"],
    ["fontkit", "index", "malicious-font or CPU sandbox"],
  ];
  for (const [pkg, owner, contract] of contracts) {
    assert.ok(contract);
    for (const prefix of ["dist", "dist/cjs"]) {
      const path = `../../packages/${pkg}/${prefix}/${owner}.d.ts`;
      assert.ok((await readFile(new URL(path, import.meta.url), "utf8")).includes(contract), path);
    }
  }
});
