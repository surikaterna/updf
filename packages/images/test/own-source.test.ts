import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { h } from "@updf/core/vdom";
import { Image, images as preparedImages } from "@updf/images";
import { images } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { renderAsync } from "@updf/layout/async";
import { render } from "@updf/layout/render";
import { pngProvider, preparePng } from "@updf/png";
import { Source } from "@updf/text-flow/sources";
import { authored } from "../../layout/test/preparation-fixture.js";
import { fixture } from "../../png/test/helpers.js";
import { transport } from "./url-helpers.js";

const input = (src: unknown) => authored(h(Image, { src: src as string, style: { width: 20, height: 20 } }));

// node:test runs this file in its own process; every patch is restored before the next case.
async function inherited(fields: PropertyDescriptorMap, run: () => Promise<void>) {
  const saved = Object.getOwnPropertyDescriptors(Object.prototype);
  try {
    Object.defineProperties(Object.prototype, fields);
    await run();
  } finally {
    for (const key of Object.keys(fields)) {
      const descriptor = Object.hasOwn(saved, key) ? saved[key] : undefined;
      if (descriptor) Object.defineProperty(Object.prototype, key, descriptor);
      else Reflect.deleteProperty(Object.prototype, key);
    }
  }
}

function loading() {
  const actual = transport();
  const calls = { resolve: 0, load: 0 };
  const loader = {
    resolve: (...args: Parameters<typeof actual.loader.resolve>) => {
      calls.resolve++;
      return actual.loader.resolve(...args);
    },
    load: (...args: Parameters<typeof actual.loader.load>) => {
      calls.load++;
      return actual.loader.load(...args);
    },
  };
  return { extension: images({ loader, formatHandlers: [pngImages()] }), calls, actual };
}

test("owned prepared Image ignores inherited URL data/getters before and after installation", {
  concurrency: false,
}, async () => {
  const src = await preparePng(fixture());
  const options = { resources: { logo: src }, providers: [pngProvider()], extensions: [preparedImages()] };
  const expected = render(input(src), options);
  let getters = 0;
  const kind = { configurable: true, get: () => (getters++, "url") };
  const uri = { configurable: true, get: () => (getters++, "https://inherited.invalid/image.png") };
  const data = { configurable: true, writable: true, value: "url" };
  for (const fields of [
    { kind: data, src: { ...data, value: "https://inherited.invalid/image.png" } },
    { kind },
    { src: uri },
    { kind, src: uri },
  ]) {
    const captured = loading();
    await inherited(fields, async () => {
      assert.deepEqual(render(input(src), options), expected);
      assert.deepEqual(await renderAsync(input(src), options), expected);
      for (const session of [captured, loading()]) {
        const selected = { resources: { logo: src }, extensions: [session.extension] };
        assert.deepEqual(await renderAsync(input(src), selected), expected);
        assert.deepEqual(session.calls, { resolve: 0, load: 0 });
        assert.equal(session.actual.calls.fetch, 0);
        assert.equal(session.actual.calls.policy, 0);
      }
    });
  }
  assert.equal(getters, 0);
});

function sourceError(error: unknown): boolean {
  assert.ok(error instanceof DocumentError);
  assert.match(error.diagnostics[0]!.path, /\/src(?:\/kind|\/src|\/metadata)?$/u);
  assert.notEqual(error.diagnostics[0]!.code, "PHASE");
  return true;
}

test("URL declarations require own data even under inherited URL fields; foreign handles stay unowned", {
  concurrency: false,
}, async () => {
  const prepared = await preparePng(fixture());
  const session = loading();
  const options = { extensions: [session.extension] };
  let getters = 0;
  const kind = { configurable: true, get: () => (getters++, "url") };
  const src = { configurable: true, get: () => (getters++, "logo") };
  for (const fields of [
    { kind: { configurable: true, writable: true, value: "url" }, src: { configurable: true, value: "logo" } },
    { kind },
    { src },
    { kind, src },
  ])
    await inherited(fields, async () => {
      await assert.rejects(
        async () => renderAsync(authored(h(Image, { style: { width: 20, height: 20 } } as never)), options),
        sourceError,
      );
      for (const value of [{}, { kind: "url" }, { src: "logo" }, { ...prepared }, new Proxy(prepared, {})]) {
        assert.throws(() => render(input(value), { extensions: [preparedImages()] }), sourceError);
        await assert.rejects(renderAsync(input(value), options), sourceError);
      }
    });
  for (const value of [
    null,
    Symbol("url"),
    { kind: "unknown", src: "logo" },
    Object.defineProperty({ src: "logo" }, "kind", kind),
    Object.defineProperty({ kind: "url" }, "src", src),
  ])
    await assert.rejects(async () => renderAsync(input(value), options), sourceError);
  assert.equal(getters, 0);
  assert.deepEqual(session.calls, { resolve: 0, load: 0 });
  assert.equal(session.actual.calls.fetch, 0);
});

test("own URL records and strings retain the same handler and captured mutable declarations", async () => {
  const prepared = await preparePng(fixture());
  const expected = render(input(prepared), {
    resources: { Prepared0: prepared },
    providers: [pngProvider()],
    extensions: [preparedImages()],
  });
  for (const value of ["logo", Source.url("logo"), { kind: "url", src: "logo" }]) {
    const session = loading();
    const pending = renderAsync(input(value), { extensions: [session.extension] });
    if (typeof value === "object" && !Object.isFrozen(value)) Object.assign(value, { kind: 1, src: null });
    assert.deepEqual(await pending, expected);
    assert.deepEqual(session.calls, { resolve: 1, load: 1 });
    assert.equal(session.actual.calls.fetch, 1);
  }
});
