import assert from "node:assert/strict";
import test from "node:test";
import { AssetError, type AssetLoader } from "@updf/assets";
import { prepareFont } from "@updf/fontkite";
import { loadFont, type LoadFontOptions } from "@updf/fontkite/load";
import { diagnostic, fixture } from "./helpers.js";

test("optional load entry accepts bytes and explicit URI loaders without widening format support", async () => {
  const bytes = await fixture();
  assert.deepEqual((await loadFont(bytes)).metadata, prepareFont(bytes).metadata);
  const loader: AssetLoader = {
    resolve: (value) => value,
    load: async (source, options) => {
      assert.equal(source, "https://example.test/font.ttf");
      assert.equal(options?.maxBytes, 4 * 1024 * 1024);
      return bytes;
    },
  };
  assert.deepEqual((await loadFont("https://example.test/font.ttf", { loader })).metadata, prepareFont(bytes).metadata);
  await assert.rejects(loadFont("https://example.test/font.ttf"), diagnostic("FONT_LOAD"));
  await assert.rejects(loadFont(new Uint8Array([1, 2, 3])), diagnostic());
});

test("load maps asset errors and honors cancellation before and after transport", async () => {
  const controller = new AbortController(),
    bytes = await fixture();
  const loader: AssetLoader = {
    resolve: (value) => value,
    load: async () => {
      controller.abort();
      return bytes;
    },
  };
  await assert.rejects(loadFont("font.ttf", { loader, signal: controller.signal }), diagnostic("FONT_LOAD"));
  await assert.rejects(loadFont(bytes, { signal: controller.signal }), diagnostic("FONT_LOAD"));
  const broken: AssetLoader = {
    resolve: (value) => value,
    load: async () => {
      throw new AssetError("LOAD", "/source", "offline");
    },
  };
  await assert.rejects(loadFont("font.ttf", { loader: broken }), diagnostic("FONT_LOAD"));
  await assert.rejects(loadFont(bytes, { loader: undefined } as unknown as LoadFontOptions), diagnostic("TYPE"));
});
