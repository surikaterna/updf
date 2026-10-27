import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { h } from "@updf/core/vdom";
import { Image, images as preparedImages } from "@updf/images";
import { images } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { jpegImages } from "@updf/images/jpeg";
import { renderAsync } from "@updf/layout/async";
import { render } from "@updf/layout/render";
import { layoutPrepared, prepareDocument } from "@updf/layout/internal-preparation";
import { pngProvider, preparePng } from "@updf/png";
import { jpegProvider, prepareJpeg } from "@updf/jpeg";
import { Source } from "@updf/text-flow/sources";
import { authored } from "../../layout/test/preparation-fixture.js";
import { fixture } from "../../png/test/helpers.js";
import { fixture as jpeg } from "../../jpeg/test/helpers.js";
import { transport } from "./url-helpers.js";

const image = (src: Parameters<typeof Image>[0]["src"], width = 20) => h(Image, { src, style: { width, height: 20 } });

test("actual URL PNG transport/codec/provider yields prepared-control PDF; aliases dedupe per operation", async () => {
  const { loader, calls } = transport();
  const extension = images({ loader, formatHandlers: [pngImages()] });
  const input = authored([image(Source.url("logo.png")), image("https://fixtures.invalid/base/logo.png", 40)]);
  const actual = await renderAsync(input, { extensions: [extension] });
  const src = await preparePng(fixture());
  const expected = render(authored([image(src), image(src, 40)]), {
    resources: { Prepared0: src },
    providers: [pngProvider()],
    extensions: [preparedImages()],
  });
  assert.deepEqual(actual, expected);
  assert.equal(calls.fetch, 1);
  assert.equal(calls.release, 1);
  // resolve per occurrence, plus the asset owner's policy check for its one load.
  assert.equal(calls.policy, 3);
  assert.deepEqual(await renderAsync(input, { extensions: [extension] }), expected);
  assert.equal(calls.fetch, 2);
});

test("JPEG byte signature wins over .png URL suffix; actual provider output matches prepared control", async () => {
  const { loader, calls } = transport(jpeg());
  const actual = await renderAsync(authored(image("actually-jpeg.png")), {
    extensions: [images({ loader, formatHandlers: [pngImages(), jpegImages()] })],
  });
  const src = prepareJpeg(jpeg());
  assert.deepEqual(
    actual,
    render(authored(image(src)), {
      resources: { Prepared0: src },
      providers: [jpegProvider()],
      extensions: [preparedImages()],
    }),
  );
  assert.equal(calls.fetch, 1);
});

test("public async prepared-only path has exact synchronous option mapping parity", async () => {
  const src = await preparePng(fixture());
  const input = authored(image(src));
  const options = { resources: { logo: src }, providers: [pngProvider()], extensions: [preparedImages()] };
  assert.deepEqual(await renderAsync(input, options), render(input, options));
  const noUrls = images({ loader: transport().loader, formatHandlers: [pngImages()] });
  assert.deepEqual(
    await renderAsync(input, { resources: { logo: src }, extensions: [noUrls] }),
    render(input, options),
  );
});

test("resolved resource identities and first aliases are operation-local and deterministic", async () => {
  const { loader } = transport();
  const input = authored([image("one"), image("two")]);
  const result = layoutPrepared(
    await prepareDocument(input, {
      extensions: [images({ loader, formatHandlers: [pngImages()] })],
    }),
  );
  assert.notEqual(result.options.resources.Prepared0, result.options.resources.Prepared1);
});

test("independently installed competing codec provider fails rather than silently collapsing by format", async () => {
  const src = await preparePng(fixture());
  const { loader } = transport();
  await assert.rejects(
    renderAsync(authored(image(src)), {
      resources: { logo: src },
      providers: [pngProvider()],
      extensions: [images({ loader, formatHandlers: [pngImages()] })],
    }),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "RESOURCE",
  );
});
