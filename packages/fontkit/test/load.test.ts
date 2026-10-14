import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createAssetLoader } from "@updf/assets";
import { DocumentError } from "@updf/core";
import { prepareFont } from "@updf/fontkit";
import { loadFont } from "@updf/fontkit/load";

const fixture = () =>
  new Uint8Array(readFileSync(new URL("../../../tests/fixtures/fonts/LiberationSans-Regular.ttf", import.meta.url)));
const code = (expected: string) => (error: unknown) =>
  error instanceof DocumentError && error.diagnostics[0]?.code === expected;

test("loadFont supports bytes and configured URIs with the same prepared metadata and no implicit fetch", async () => {
  const bytes = fixture();
  const direct = prepareFont(bytes);
  assert.deepEqual((await loadFont(bytes)).metadata, direct.metadata);
  let fetches = 0;
  const loader = createAssetLoader({
    fetch: async (_uri, init) => {
      fetches++;
      assert.equal(init?.credentials, "omit");
      assert.equal(init?.redirect, "error");
      return new Response(fixture());
    },
  });
  assert.deepEqual((await loadFont("https://example.com/font.ttf", { loader })).metadata, direct.metadata);
  assert.equal(fetches, 1);
  await loadFont(bytes, { loader });
  assert.equal(fetches, 1);
  await assert.rejects(loadFont("https://example.com/font.ttf"), code("FONT_LOAD"));
  bytes.fill(0);
  assert.equal(direct.metadata.format, "static-truetype");
});

test("loading preserves the static TrueType profile and gives a useful stylesheet/WOFF diagnostic", async () => {
  for (const bytes of [
    new TextEncoder().encode("@font-face {src:url(font.woff2)}"),
    new TextEncoder().encode("wOF2not-a-ttf"),
  ]) {
    await assert.rejects(
      loadFont(bytes),
      (error: unknown) =>
        code("FONT_FORMAT")(error) &&
        error instanceof Error &&
        /direct static TrueType.*CSS stylesheet/u.test(error.message),
    );
  }
  await assert.rejects(loadFont(new Uint8Array(4 * 1024 * 1024 + 1)), code("LIMIT"));
  const loader = createAssetLoader({
    maxBytes: 8 * 1024 * 1024,
    fetch: async () => new Response(new Uint8Array(4 * 1024 * 1024 + 1)),
  });
  await assert.rejects(loadFont("https://example.com/large.ttf", { loader }), code("LIMIT"));
  const strict = createAssetLoader({ maxBytes: 10 });
  await assert.rejects(loadFont(fixture(), { loader: strict }), code("LIMIT"));
});

test("font cancellation and invalid loader inputs reject before publishing a prepared handle", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(loadFont(fixture(), { signal: controller.signal }), code("FONT_LOAD"));
  const abort = new AbortController();
  const loader = createAssetLoader({
    fetch: async () => {
      abort.abort();
      return new Response(fixture());
    },
  });
  await assert.rejects(loadFont("https://example.com/a", { loader, signal: abort.signal }), code("FONT_LOAD"));
  await assert.rejects(loadFont(fixture(), { loader: {} as ReturnType<typeof createAssetLoader> }), code("TYPE"));
  await assert.rejects(
    loadFont(fixture(), {
      get loader(): ReturnType<typeof createAssetLoader> {
        throw new Error("getter executed");
      },
    }),
    code("TYPE"),
  );
});
