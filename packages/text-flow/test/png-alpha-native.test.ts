import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { render, type NodeDefinition } from "@updf/core";
import { h } from "@updf/core/vdom";
import { Document, Flow, Paragraph, pt } from "@updf/layout";
import { Image } from "@updf/images";
import { images } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { layoutPrepared, prepareDocument } from "@updf/layout/internal-preparation";
import { textFlow } from "@updf/text-flow";
import { pngAlphaShapes } from "@updf/text-flow/png-alpha";
import { Source } from "@updf/text-flow/sources";
import { compositionOptions } from "../../../tests/fixtures/text-flow/options.js";
import { transport } from "../../images/test/url-helpers.js";
import { alphaPng } from "./png-shape-fixture.js";
import { FloatingImage, FloatingBlock } from "./png-alpha-fixture.js";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
function nativeImages(nodes: readonly NodeDefinition[], x = 0, y = 0): Rect[] {
  return nodes.flatMap((node) => {
    if (node.type === "xObject")
      return [{ x: x + (node.x ?? 0), y: y + (node.y ?? 0), width: node.width, height: node.height }];
    if (node.type !== "paintGroup") return [];
    const m = node.transform ?? [1, 0, 0, 1, 0, 0];
    assert.deepEqual(m.slice(0, 4), [1, 0, 0, 1]);
    return nativeImages(node.children, x + m[4]!, y + m[5]!);
  });
}
function redPixels(pdf: Uint8Array, inspect: (x: number, y: number) => void): number {
  const ppm = execFileSync("pdftoppm", ["-r", "144", "-singlefile", "-"], { input: pdf, maxBuffer: 8 * 1024 * 1024 });
  const header = /^P6\s+(\d+)\s+(\d+)\s+255\s/u.exec(ppm.toString("ascii", 0, 40))!;
  assert.ok(header);
  let red = 0;
  for (let y = 0; y < Number(header[2]); y++) {
    for (let x = 0; x < Number(header[1]); x++) {
      const at = header[0].length + 3 * (y * Number(header[1]) + x);
      if (ppm[at]! < 100 || ppm[at + 1]! > 40 || ppm[at + 2]! > 40) continue;
      red++;
      inspect((x + 0.5) / 2, (y + 0.5) / 2);
    }
  }
  return red;
}
function tree(side: "left" | "right", shape: boolean, threshold = 0.5, block = false) {
  const style = {
    width: 160,
    height: 100,
    paddingLeft: 10,
    paddingRight: 20,
    paddingTop: 5,
    paddingBottom: 15,
    float: side,
    ...(shape ? { shapeOutside: Source.url("mask.png"), shapeImageThreshold: threshold } : {}),
  };
  const image = h(FloatingImage, { src: "visual.png", fit: "contain", style } as never, "visual");
  return h(Document, {
    children: h(Flow, {
      pageSize: { width: 300, height: 300 },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      children: [
        block
          ? h(FloatingBlock, {
              style,
              children: h(Image, { src: "visual.png", style: { width: 20, height: 20 } }),
            } as never)
          : image,
        h(
          Paragraph,
          {
            style: { color: [1, 0, 0], fontSize: 14, lineHeight: pt(16) },
            children: "Automatic PNG masks keep all visible text outside occupied threshold cells. ".repeat(6),
          },
          "text",
        ),
      ],
    }),
  });
}
async function run(side: "left" | "right", shape = true, threshold = 0.5, block = false) {
  // Different aspect ratios: the 4x4 mask is stretched to the 4x2 visual's actual painted rectangle.
  const pixels = [255, 255, 0, 0, 255, 0, 0, 64, 0, 0, 255, 0, 0, 255, 255, 0];
  const { loader } = transport(alphaPng(4, 4, pixels));
  const original = loader.load;
  const visual = transport(alphaPng(4, 2, Array(8).fill(255))).loader;
  const load: typeof loader.load = (url, options) =>
    typeof url === "string" && url.endsWith("visual.png") ? visual.load(url, options) : original(url, options);
  const output = layoutPrepared(
    await prepareDocument(tree(side, shape, threshold, block), {
      ...compositionOptions(),
      extensions: [
        textFlow({ handlers: [pngAlphaShapes()] }),
        images({ loader: { ...loader, load }, formatHandlers: [pngImages()] }),
      ],
    }),
  );
  return { output, pixels };
}
test("actual left/right Image placement, letterbox and threshold cells clear real native text without changing paint", async () => {
  for (const side of ["left", "right"] as const) {
    const { output, pixels } = await run(side);
    const [rect] = nativeImages(output.document.pages[0]!.children);
    assert.ok(rect);
    assert.equal(rect.width / rect.height, 2);
    const plain = await run(side, false);
    assert.deepEqual(nativeImages(plain.output.document.pages[0]!.children), [rect]);
    const pdf = render(output.document, output.options);
    assert.ok(
      redPixels(pdf, (x, y) => {
        const col = Math.floor(((x - rect.x) * 4) / rect.width),
          row = Math.floor(((y - rect.y) * 4) / rect.height);
        if (col < 0 || col >= 4 || row < 0 || row >= 4) return;
        assert.ok(pixels[row * 4 + col]! / 255 <= 0.5, `${side}: red pixel in occupied mask at ${x},${y}`);
      }) > 100,
    );
    assert.deepEqual(output.placements[0]!.sourceKeys, ["visual", "text"]);
  }
});
test("threshold one leaves zero obstruction while retaining one positive-height painted visual", async () => {
  const { output } = await run("left", true, 1);
  assert.equal(nativeImages(output.document.pages[0]!.children).length, 1);
  assert.ok(output.placements[0]!.box.height >= 100);
  let overlapping = 0;
  assert.ok(
    redPixels(render(output.document, output.options), (x, y) => {
      if (x < 160 && y < 100) overlapping++;
    }) > 100,
  );
  assert.ok(overlapping > 0);
});
test("generic Block projects against its border box rather than a descendant Image reference", async () => {
  const { output, pixels } = await run("left", true, 0.5, true);
  assert.equal(nativeImages(output.document.pages[0]!.children)[0]!.width, 20);
  assert.ok(
    redPixels(render(output.document, output.options), (x, y) => {
      const col = Math.floor(x / 40),
        row = Math.floor(y / 25);
      if (col < 0 || col >= 4 || row < 0 || row >= 4) return;
      assert.ok(pixels[row * 4 + col]! / 255 <= 0.5);
    }) > 100,
  );
});
