import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { h } from "@updf/core/vdom";
import { Image, images } from "@updf/images";
import { jpegProvider, prepareJpeg } from "@updf/jpeg";
import { Block, fixed, layout, Paragraph, Span } from "@updf/layout";
import { render } from "@updf/layout/render";
import { pngProvider, preparePng } from "@updf/png";
import { floatable, textFlow } from "@updf/text-flow";
import { pathShapes } from "@updf/text-flow/path";
import { Source } from "@updf/text-flow/sources";
import { textOptions } from "../../../tests/fixtures/text-options.js";
import { fixture } from "../../png/test/helpers.js";
import { binary, document, withoutIdentityGroups, withoutImages } from "./helpers.js";

const FloatingImage = floatable(Image);
const FloatingBlock = floatable(Block);
test("both image formats float left/right with rich Span text, preserving the manual native fixture", async () => {
  const base = textOptions({});
  const sources = [await preparePng(fixture()), prepareJpeg(await readFile("tests/fixtures/jpeg/color-2x2.jpg"))];
  for (const src of sources) {
    const options = {
      ...base,
      resources: { ...base.resources, logo: src },
      providers: [...(base.providers ?? []), pngProvider(), jpegProvider()],
      extensions: [images(), textFlow()],
    };
    for (const float of ["left", "right"] as const) {
      const style = { width: 60, height: 80, float, paddingTop: 1.1, paddingBottom: 0.1 };
      const paragraph = () =>
        h(Paragraph, {
          children: [
            "before ",
            h(Span, { style: { fontSize: 14 }, children: "rich span " }),
            "full text follows around the image rectangle. ".repeat(12),
          ],
        });
      const input = document([h(FloatingImage, { src, fit: "fill", style }), paragraph()]);
      const manual = document([
        h(FloatingBlock, {
          style,
          children: fixed({
            height: 78.8,
            children: [{ type: "xObject", resource: "logo", x: 0, y: 0, width: 60, height: 78.8 }],
          }),
        }),
        paragraph(),
      ]);
      const result = layout(input, options);
      const expected = layout(manual, options);
      assert.deepEqual(result.placements, expected.placements);
      assert.deepEqual(
        result.document.pages.map((page) => withoutIdentityGroups(page.children)),
        expected.document.pages.map((page) => withoutIdentityGroups(page.children)),
      );
      const output = binary(render(input, options));
      assert.equal((output.match(/\/X1 Do/g) ?? []).length, 1);
      assert.equal((output.match(/\/Subtype \/Image/g) ?? []).length, src.metadata.kind === "png" ? 2 : 1);
      assert.ok(result.pageCount > 0);
    }
  }
});

test("contain letterboxing leaves default exclusion at the outer Block; manual Source geometry needs its handler", async () => {
  const src = await preparePng(fixture());
  const base = textOptions({});
  const options = {
    ...base,
    resources: { ...base.resources, logo: src },
    providers: [...(base.providers ?? []), pngProvider()],
    extensions: [images(), textFlow()],
  };
  const style = { width: 80, height: 40, float: "left" as const };
  const paragraph = () => h(Paragraph, { children: "text around a letterboxed image ".repeat(10) });
  const contained = layout(document([h(FloatingImage, { src, style }), paragraph()]), options);
  const filled = layout(document([h(FloatingImage, { src, fit: "fill", style }), paragraph()]), options);
  assert.deepEqual(
    contained.document.pages.map((page) => withoutImages(page.children)),
    filled.document.pages.map((page) => withoutImages(page.children)),
  );
  const shaped = document([
    h(FloatingImage, { src, style: { ...style, shapeOutside: Source.polygon([0, 0, 80, 0, 0, 40]) } }),
    paragraph(),
  ]);
  assert.throws(() => layout(shaped, options), /pathShapes/u);
  assert.doesNotThrow(() =>
    render(shaped, { ...options, extensions: [images(), textFlow({ handlers: [pathShapes()] })] }),
  );
});
