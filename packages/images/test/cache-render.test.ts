import assert from "node:assert/strict";
import test from "node:test";
import { ownedResourceBytes } from "@updf/core/resources";
import { images } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { jpegImages } from "@updf/images/jpeg";
import { browserPngImages } from "@updf/images/browser-png";
import { renderAsync } from "@updf/layout/async";
import { fixture as jpeg } from "../../jpeg/test/helpers.js";
import { transport } from "./url-helpers.js";
import { cache, code, image, render, resource, tree } from "./cache-helpers.js";
import { authored } from "../../layout/test/preparation-fixture.js";

test("real PNG and JPEG cross-render results preserve exact PDFs, identities, and per-document aliases", async () => {
  for (const [bytes, handler] of [
    [undefined, pngImages()],
    [jpeg(), jpegImages()],
  ] as const) {
    const { loader, calls } = transport(bytes);
    const config = { loader, formatHandlers: [handler], cache: cache() };
    const first = await render(config, ["logo", "logo"]);
    assert.deepEqual(await render(config, ["logo", "logo"]), first);
    assert.equal(calls.fetch, 1);
    assert.equal(calls.policy, 5);
    const a = await resource(config);
    const b = await resource({ ...config, formatHandlers: [handler] });
    assert.equal(a, b);
    const aliased = await renderAsync(authored(image("logo")), {
      resources: { borrowed: a },
      extensions: [images(config)],
    });
    assert.match(Buffer.from(aliased).toString("latin1"), /\/X1 Do/u);
    assert.equal(calls.fetch, 1);
    assert.equal(config.cache.snapshot().entries, 1);
  }
});

test("policy keys use original loader, functions and ordered original owned handles, never bound wrappers or kind", async () => {
  const { loader, calls } = transport();
  const handlers = [pngImages(), jpegImages()];
  const config = { loader, formatHandlers: handlers, cache: cache() };
  await render(config);
  await render({ ...config });
  assert.equal(calls.fetch, 1);
  await render({ ...config, loader: { ...loader } });
  await render({ ...config, formatHandlers: [...handlers].reverse() });
  await render({ ...config, formatHandlers: [pngImages(), handlers[1]!] });
  await render({ ...config, formatHandlers: [browserPngImages(), handlers[1]!] });
  assert.equal(calls.fetch, 5);
  const mutable = { ...loader };
  const old = images({ ...config, loader: mutable });
  await renderAsync(tree(), { extensions: [old] });
  mutable.load = loader.load.bind(loader);
  await renderAsync(tree(), { extensions: [old] });
  assert.equal(calls.fetch, 6);
  await render({ ...config, loader: mutable });
  assert.equal(calls.fetch, 7);
  mutable.resolve = loader.resolve.bind(loader);
  await render({ ...config, loader: mutable });
  assert.equal(calls.fetch, 8);
});

test("URL policy runs before shared and local hits; prepared sources bypass transport and cache", async () => {
  const actual = transport();
  let denied = false,
    resolves = 0;
  const loader = {
    ...actual.loader,
    resolve(url: string) {
      resolves++;
      if (denied) throw new Error("denied");
      return actual.loader.resolve(url);
    },
  };
  const config = { loader, formatHandlers: [pngImages()], cache: cache() };
  const src = await resource(config);
  denied = true;
  await assert.rejects(render(config), /denied/u);
  assert.equal(actual.calls.fetch, 1);
  config.cache.dispose();
  await renderAsync(authored(image(src)), { resources: { saved: src }, extensions: [images(config)] });
  assert.equal(resolves, 2);
});

test("warm hit bypasses transport allowance, not owned retained admission; identical prebound handle costs zero", async () => {
  const { loader, calls } = transport();
  const config = { loader, formatHandlers: [pngImages()], cache: cache() };
  const src = await resource(config);
  const bytes = ownedResourceBytes(src);
  assert.ok(bytes > 0);
  await assert.rejects(render(config, undefined, undefined, bytes - 1), code("LIMIT"));
  const pdf = await renderAsync(tree(), {
    resources: { exact: src },
    limits: { resourceBytes: bytes },
    extensions: [images(config)],
  });
  assert.match(Buffer.from(pdf).toString("latin1"), /\/X1 Do/u);
  assert.equal(calls.fetch, 1);
});

test("LRU hits move order; evicted resources remain valid; snapshots don't mutate recency", async () => {
  const { loader, calls } = transport();
  const config = { loader, formatHandlers: [pngImages()], cache: cache({ maxEntries: 2 }) };
  const src = await resource(config);
  await render(config, ["b"]);
  await render(config);
  config.cache.snapshot();
  await render(config, ["c"]);
  await render(config);
  assert.equal(calls.fetch, 3);
  await render(config, ["b"]);
  assert.equal(calls.fetch, 4);
  config.cache.dispose();
  await renderAsync(authored(image(src)), { resources: { saved: src }, extensions: [images(config)] });
});

test("failed retained admission preserves successful preparation and warm hits still enforce budgets", async () => {
  const { loader, calls } = transport();
  const config = { loader, formatHandlers: [pngImages()], cache: cache() };
  // Source PNG is smaller than the native inflated resource.
  const src = await resource({ loader, formatHandlers: config.formatHandlers });
  config.cache.clear();
  const bytes = ownedResourceBytes(src);
  await assert.rejects(render(config, undefined, undefined, bytes - 1), code("LIMIT"));
  assert.equal(config.cache.snapshot().entries, 1);
  const fetches = calls.fetch;
  await assert.rejects(render(config, undefined, undefined, bytes - 1), code("LIMIT"));
  assert.equal(config.cache.snapshot().entries, 1);
  assert.ok((await render(config)).length > 100);
  assert.equal(calls.fetch, fetches);
});
