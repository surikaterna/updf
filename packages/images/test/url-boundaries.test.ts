import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { h } from "@updf/core/vdom";
import { Image, images as preparedImages } from "@updf/images";
import { createAssetLoader, images, type ImagesOptions } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { renderAsync } from "@updf/layout/async";
import { render } from "@updf/layout/render";
import { authored } from "../../layout/test/preparation-fixture.js";
import { transport } from "./url-helpers.js";

const input = (src: unknown = "logo") => authored(h(Image, { src: src as string, style: { width: 20, height: 20 } }));
const code = (expected: string) => (error: unknown) =>
  error instanceof DocumentError && error.diagnostics[0]?.code === expected;

test("root accepts zero arguments only; load requires explicit immutable owned configuration", () => {
  const { loader, calls } = transport();
  const valid = { loader, formatHandlers: [pngImages()] };
  for (const value of [undefined, null, valid, {}])
    assert.throws(() => Reflect.apply(preparedImages, null, [value]), code("TYPE"));
  for (const value of [
    undefined,
    null,
    {},
    { loader },
    { ...valid, formatHandlers: [] },
    { ...valid, formatHandlers: [pngImages(), pngImages()] },
    { ...valid, formatHandlers: [{}] },
    { ...valid, formatHandlers: [{ ...pngImages() }] },
    { ...valid, extra: true },
    { ...valid, loader: Object.create(loader) },
  ])
    assert.throws(() => images(value as ImagesOptions), DocumentError);
  assert.equal(calls.fetch, 0);
});

test("all syntax/configuration capture completes before I/O; structural sources are strict and getter-free", async () => {
  const { loader, calls } = transport();
  let getters = 0;
  const accessor = {
    kind: "url",
    get src() {
      getters++;
      return "logo";
    },
  };
  const options = { extensions: [images({ loader, formatHandlers: [pngImages()] })] };
  for (const src of [
    null,
    [],
    {},
    { kind: "png", src: "logo" },
    { kind: "url", src: 1 },
    { kind: "url", src: "logo", extra: true },
    Object.create({ kind: "url", src: "logo" }),
    accessor,
  ])
    await assert.rejects(async () => renderAsync(input(src), options), DocumentError);
  await assert.rejects(
    renderAsync(
      authored([
        h(Image, { src: "good", style: { width: 20, height: 20 } }),
        h(Image, { src: "bad", fit: "invalid" as "fill", style: { width: 20, height: 20 } }),
      ]),
      options,
    ),
    DocumentError,
  );
  assert.equal(getters, 0);
  for (const style of [
    { width: 20, height: 20, extra: 1 },
    { width: 20, height: 20, padding: -1 },
    { width: 20, height: 20, minWidth: 10, maxWidth: 1 },
    { width: 20, height: 20, overflow: null },
  ])
    await assert.rejects(
      renderAsync(authored(h(Image, { src: "logo", style: style as never })), options),
      DocumentError,
    );
  assert.equal(calls.fetch, 0);
});

test("sync and missing loading installation reject URLs as PHASE without any fetch", async () => {
  const { loader, calls } = transport();
  const options = { extensions: [images({ loader, formatHandlers: [pngImages()] })] };
  assert.throws(() => render(input(), options), code("PHASE"));
  await assert.rejects(renderAsync(input(), { extensions: [preparedImages()] }), code("PHASE"));
  await assert.rejects(renderAsync(input(), { extensions: [preparedImages(), ...options.extensions] }), code("VALUE"));
  assert.equal(calls.fetch, 0);
});

test("separate preparation options preserve own-data/native/structural signal rules", async () => {
  const { loader, calls } = transport();
  const options = { extensions: [images({ loader, formatHandlers: [pngImages()] })] };
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(renderAsync(input(), options, { signal: controller.signal }), /aborted/u);
  const structural = { aborted: true, addEventListener() {}, removeEventListener() {} };
  await assert.rejects(renderAsync(input(), options, { signal: structural }), /aborted/u);
  for (const preparation of [
    null,
    { signal: null },
    { signal: undefined },
    { extra: 1 },
    Object.create({ signal: controller.signal }),
    {
      get signal() {
        throw new Error("getter read");
      },
    },
  ])
    await assert.rejects(renderAsync(input(), options, preparation as never), DocumentError);
  assert.equal(calls.fetch, 0);
});

test("zero retained allowance and cumulative transport limits reject before a later fetch", async () => {
  const { loader, calls } = transport();
  const options = { extensions: [images({ loader, formatHandlers: [pngImages()] })] };
  await assert.rejects(renderAsync(input(), { ...options, limits: { resourceBytes: 0 } }), code("LIMIT"));
  assert.equal(calls.fetch, 0);
  await assert.rejects(renderAsync(input(), { ...options, limits: { resourceBytes: 1 } }), /limit|bytes|exceed/iu);
  assert.equal(calls.cancel, 1);
  assert.equal(calls.release, 1);
});

test("blocked schemes and credentials use asset policy; denial is checked on a cache hit", async () => {
  let requests = 0;
  const loader = createAssetLoader({
    fetch: async () => {
      requests++;
      throw new Error("unreachable");
    },
  });
  const options = { extensions: [images({ loader, formatHandlers: [pngImages()] })] };
  for (const src of ["file:///tmp/a", "data:image/png;base64,AA==", "https://u:p@example.invalid/a"])
    await assert.rejects(renderAsync(input(src), options));
  assert.equal(requests, 0);
  const actual = transport();
  let policies = 0;
  const checked = {
    ...actual.loader,
    resolve(uri: string) {
      policies++;
      if (policies === 2) throw new Error("denied cached alias");
      return actual.loader.resolve(uri);
    },
  };
  await assert.rejects(
    renderAsync(authored([inputImage("logo"), inputImage("logo")]), {
      extensions: [images({ loader: checked, formatHandlers: [pngImages()] })],
    }),
    /denied cached alias/u,
  );
  assert.equal(actual.calls.fetch, 1);
});

function inputImage(src: string) {
  return h(Image, { src, style: { width: 20, height: 20 } });
}
