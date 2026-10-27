import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { render as nativeRender } from "@updf/core";
import { h } from "@updf/core/vdom";
import { Image, images } from "@updf/images";
import { jpegProvider, prepareJpeg } from "@updf/jpeg";
import { Block, fixed, layout, measure, PageBreak } from "@updf/layout";
import { render } from "@updf/layout/render";
import { pngProvider, preparePng } from "@updf/png";
import { fixture } from "../../png/test/helpers.js";
import { binary, document, withoutIdentityGroups } from "./helpers.js";

test("real prepared PNG/JPEG render using only images plus the explicitly selected codec provider", async () => {
  const png = await preparePng(fixture());
  const jpeg = prepareJpeg(await readFile("tests/fixtures/jpeg/color-2x2.jpg"));
  for (const [src, provider, count] of [
    [png, pngProvider(), 2],
    [jpeg, jpegProvider(), 1],
  ] as const) {
    const options = { resources: { logo: src }, providers: [provider], extensions: [images()] };
    const input = document(h(Image, { src, style: { width: 120, height: 80 } }));
    const output = render(input, options);
    assert.equal((binary(output).match(/\/Subtype \/Image/g) ?? []).length, count);
    const rectangle =
      src.metadata.kind === "png"
        ? { x: 20, y: 0, width: 80, height: 80 }
        : { x: 6.666666666666671, y: 0, width: 106.66666666666666, height: 80 };
    const expected = {
      version: 1 as const,
      pages: [{ width: 200, height: 200, children: [{ type: "xObject" as const, resource: "logo", ...rectangle }] }],
    };
    assert.deepEqual(
      withoutIdentityGroups(layout(input, options).document.pages[0]!.children),
      expected.pages[0]!.children,
    );
    assert.equal((binary(nativeRender(expected, options)).match(/\/Subtype \/Image/g) ?? []).length, count);
    assert.deepEqual(measure(h(Image, { src, style: { width: 120, height: 80 } }), { width: 200 }, options).size, {
      width: 120,
      height: 80,
    });
  }
});

test("aliases choose the first bound name; repeated boxes/pages embed the same identity once", async () => {
  const src = await preparePng(fixture());
  const options = { resources: { first: src, second: src }, providers: [pngProvider()], extensions: [images()] };
  const child = (width: number, height: number) => h(Image, { src, fit: "fill", style: { width, height } });
  const input = document([child(30, 20), h(PageBreak, {}), child(60, 40)]);
  const result = layout(input, options);
  const json = JSON.stringify(result.document);
  assert.match(json, /"resource":"first"/u);
  assert.ok(!json.includes('"resource":"second"'));
  const output = binary(render(input, options));
  assert.equal((output.match(/\/Subtype \/Image/g) ?? []).length, 2);
  assert.equal((output.match(/\/X1 Do/g) ?? []).length, 2);
  const other = await preparePng(fixture());
  const distinct = binary(
    render(document([child(30, 20), h(Image, { src: other, style: { width: 30, height: 20 } })]), {
      ...options,
      resources: { first: src, other },
    }),
  );
  assert.equal((distinct.match(/\/Subtype \/Image/g) ?? []).length, 4);
  const renamed = JSON.stringify(layout(document(child(30, 20)), { ...options, resources: { renamed: src } }).document);
  assert.match(renamed, /"resource":"renamed"/u);
});

test("canonical Block min/max, asymmetric padding and borders resolve the actual content rectangle", async () => {
  const src = await preparePng(fixture());
  const options = { resources: { logo: src }, providers: [pngProvider()], extensions: [images()] };
  const style = {
    width: 100,
    minWidth: 120,
    maxWidth: 130,
    height: 100,
    minHeight: 50,
    maxHeight: 80,
    paddingTop: 3,
    paddingBottom: 5,
    paddingLeft: 7,
    paddingRight: 9,
    border: { width: 1, color: [0, 0, 0] as const },
  };
  const output = binary(render(document(h(Image, { src, fit: "fill", style })), options));
  // Outer 120x80; content 102x70; its origin is (8,4), not the authored dimensions.
  assert.match(output, /1 0 0 1 8 4 cm/u);
  assert.match(output, /102 0 0 -70 0 70 cm\n\/X1 Do/u);
  assert.deepEqual(measure(h(Image, { src, style }), { width: 200 }, options).size, { width: 120, height: 80 });
  for (const overflow of ["error", "hidden"] as const)
    assert.doesNotThrow(() => render(document(h(Image, { src, style: { ...style, overflow } })), options));
});

test("fractional definite heights transport metrics, not outward native capacity", async () => {
  const src = await preparePng(fixture());
  const options = { resources: { logo: src }, providers: [pngProvider()], extensions: [images()] };
  for (const fit of [undefined, "fill"] as const) {
    const style = { width: 100, height: 80, paddingTop: 1.1, paddingBottom: 0.1 };
    const props = { src, ...(fit ? { fit } : {}), style };
    const rectangle = { x: fit ? 0 : 10.600000000000001, y: 0, width: fit ? 100 : 78.8, height: 78.8 };
    const manual = h(Block, {
      style,
      children: fixed({ height: 78.8, children: [{ type: "xObject", resource: "logo", ...rectangle }] }),
    });
    assert.deepEqual(measure(h(Image, props), { width: 200 }, options).size, { width: 100, height: 80 });
    assert.deepEqual(
      withoutIdentityGroups(layout(document(h(Image, props)), options).document.pages[0]!.children),
      withoutIdentityGroups(layout(document(manual), options).document.pages[0]!.children),
    );
    assert.equal((binary(render(document(h(Image, props)), options)).match(/\/X1 Do/g) ?? []).length, 1);
  }
});

test("fractional padding/border metric heights respect authored min/max clamps", async () => {
  const src = await preparePng(fixture());
  const options = { resources: { logo: src }, providers: [pngProvider()], extensions: [images()] };
  const borderTop = { width: 0.2, color: [0, 0, 0] as const };
  for (const limits of [
    { height: 100, maxHeight: 80 },
    { height: 60, minHeight: 80 },
  ]) {
    const style = { width: 100, ...limits, paddingTop: 1.1, paddingBottom: 0.1, borderTop };
    for (const fit of [undefined, "fill"] as const) {
      const child = h(Image, { src, ...(fit ? { fit } : {}), style });
      assert.deepEqual(measure(child, { width: 200 }, options).size, { width: 100, height: 80 });
      assert.doesNotThrow(() => render(document(child), options));
    }
  }
});

test("metric height does not waive a smaller exact native capacity", async () => {
  const src = await preparePng(fixture());
  const options = { resources: { logo: src }, providers: [pngProvider()], extensions: [images()] };
  const style = { width: 100, height: 80, paddingTop: 0.2, paddingBottom: 16.4 };
  for (const fit of [undefined, "fill"] as const) {
    const input = h(Image, { src, ...(fit ? { fit } : {}), style });
    assert.throws(() => measure(input, { width: 200 }, options), /reserved content region/u);
    assert.throws(() => render(document(input), options), /reserved content region/u);
  }
});

test("small fractional heights keep positive metric geometry and reject collapsed image content", async () => {
  const src = await preparePng(fixture());
  const options = { resources: { logo: src }, providers: [pngProvider()], extensions: [images()] };
  const style = { width: 1, height: 0.8, paddingTop: 0.011, paddingBottom: 0.001 };
  for (const fit of [undefined, "fill"] as const) {
    const child = h(Image, { src, ...(fit ? { fit } : {}), style });
    assert.deepEqual(measure(child, { width: 200 }, options).size, { width: 1, height: 0.8 });
    assert.doesNotThrow(() => render(document(child), options));
  }
  const collapsed = h(Image, { src, style: { width: 1, height: 1, paddingTop: 1 } });
  assert.throws(() => render(document(collapsed), options), /positive/u);
});
