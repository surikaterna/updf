import assert from "node:assert/strict";
import test from "node:test";
import { h } from "@updf/core/vdom";
import { Image, images as preparedImages } from "@updf/images";
import { images } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { renderAsync } from "@updf/layout/async";
import { render } from "@updf/layout/render";
import { pngProvider, preparePng } from "@updf/png";
import { authored } from "../../layout/test/preparation-fixture.js";
import { fixture } from "../../png/test/helpers.js";
import { transport } from "./url-helpers.js";

test("configuration, authored style and serialization extensions are snapshotted before suspension", async () => {
  const actual = transport();
  const loader = { ...actual.loader };
  const handlers = [pngImages()];
  const feature = images({ loader, formatHandlers: handlers });
  loader.resolve = () => {
    throw new Error("mutated resolve");
  };
  loader.load = async () => {
    throw new Error("mutated load");
  };
  handlers.length = 0;
  const style = { width: 20, height: 20 };
  const extensions = [feature];
  const pending = renderAsync(authored(h(Image, { src: "logo", style })), { extensions });
  style.width = 80;
  extensions.push(preparedImages());
  const src = await preparePng(fixture());
  const expected = render(authored(h(Image, { src, style: { width: 20, height: 20 } })), {
    resources: { Prepared0: src },
    providers: [pngProvider()],
    extensions: [preparedImages()],
  });
  assert.deepEqual(await pending, expected);
  assert.equal(actual.calls.fetch, 1);
});

test("async rendering does not silently omit malformed lowering/serialization options or getters", async () => {
  let getters = 0;
  const input = authored(null);
  for (const options of [
    null,
    { registry: null },
    { resourceMetadata: null },
    { unknown: 1 },
    Object.create({ resources: {} }),
    {
      get providers() {
        getters++;
        return [];
      },
    },
  ])
    await assert.rejects(renderAsync(input, options as never));
  assert.equal(getters, 0);
});
