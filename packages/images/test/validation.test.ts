import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createOwnedResource } from "@updf/core/resources";
import { h } from "@updf/core/vdom";
import { Image, images, type ImageProps } from "@updf/images";
import { render } from "@updf/layout/render";
import { pngProvider, preparePng } from "@updf/png";
import { fixture } from "../../png/test/helpers.js";
import { document } from "./helpers.js";

test("prepared-only boundary rejects URLs, forgeries, fonts and malformed metadata without transport", async () => {
  const src = await preparePng(fixture());
  const options = { resources: { logo: src }, providers: [pngProvider()], extensions: [images()] };
  let calls = 0;
  const previous = globalThis.fetch;
  globalThis.fetch = () => {
    calls++;
    throw new Error("unexpected fetch");
  };
  try {
    const sources: unknown[] = [
      "https://invalid.test/logo.png",
      { url: "https://invalid.test" },
      {},
      { metadata: src.metadata },
      createOwnedResource({ kind: "font", width: 2, height: 2 }),
    ];
    for (const width of [0, -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])
      sources.push(createOwnedResource({ kind: "png", width, height: 2 }));
    for (const source of sources)
      assert.throws(
        () =>
          render(document(h(Image, { src: source as ImageProps["src"], style: { width: 30, height: 20 } })), options),
        DocumentError,
      );
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = previous;
  }
});

test("missing/duplicate installation, unbound identities and missing/wrong providers fail", async () => {
  const src = await preparePng(fixture());
  const input = document(h(Image, { src, style: { width: 30, height: 20 } }));
  const base = { resources: { logo: src }, providers: [pngProvider()], extensions: [images()] };
  for (const options of [
    { ...base, extensions: [] },
    { ...base, extensions: [images(), images()] },
    { ...base, resources: {} },
    { ...base, providers: [] },
  ])
    assert.throws(() => render(input, options), DocumentError);
  const fake = createOwnedResource(src.metadata);
  assert.throws(
    () => render(document(h(Image, { src: fake, style: { width: 30, height: 20 } })), { ...base, resources: { fake } }),
    /RESOURCE|provider|XObject/u,
  );
});

test("own props, omission-only defaults, unsupported children/styles and exact dimensions reject", async () => {
  const src = await preparePng(fixture());
  const options = { resources: { logo: src }, providers: [pngProvider()], extensions: [images()] };
  const valid = { src, style: { width: 30, height: 20 } };
  let calls = 0;
  const accessor = Object.defineProperty({ style: valid.style }, "src", {
    enumerable: true,
    get() {
      calls++;
      return src;
    },
  });
  const inherited = Object.assign(Object.create({ src }), { style: valid.style });
  for (const props of [
    accessor,
    inherited,
    { ...valid, children: null },
    { ...valid, fit: undefined },
    { ...valid, fit: null },
    { ...valid, fit: "cover" },
    { ...valid, style: { width: "auto", height: 20 } },
    { ...valid, style: { width: 30, height: 20, float: "left" } },
    { ...valid, style: { width: 30, height: 20, shapeOutside: {} } },
    { ...valid, style: { width: 30, height: 20, marginTop: "auto" } },
  ])
    assert.throws(() => render(document(h(Image, props as ImageProps)), options), DocumentError);
  assert.equal(calls, 0);
});
