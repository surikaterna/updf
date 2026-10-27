import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { DocumentError, render } from "@updf/core";
import { ownedResourceBytes } from "@updf/core/resources";
import { h } from "@updf/core/vdom";
import { images } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { jpegImages } from "@updf/images/jpeg";
import { prepareDocument, layoutPrepared } from "@updf/layout/internal-preparation";
import { textFlow, floatable } from "@updf/text-flow";
import { pngAlphaShapes } from "@updf/text-flow/png-alpha";
import { Source } from "@updf/text-flow/sources";
import { Path, pathShapes } from "@updf/text-flow/path";
import { shapeSyntax } from "@updf/text-flow/syntax";
import { preparePng } from "@updf/png";
import { pngAlphaInfo } from "@updf/png/alpha";
import { fixture as jpeg } from "../../jpeg/test/helpers.js";
import { transport } from "../../images/test/url-helpers.js";
import { alphaPng } from "./png-shape-fixture.js";
import { maskTree, document, FloatingImage } from "./png-alpha-fixture.js";
import { defineHandler } from "../dist/cjs/handlers.js";

const bytes = alphaPng(2, 2, [255, 0, 0, 255]);
function selected(options = {}, data = bytes) {
  const { loader, calls } = transport(data);
  return {
    calls,
    extensions: [textFlow({ handlers: [pngAlphaShapes(options)] }), images({ loader, formatHandlers: [pngImages()] })],
  };
}
test("automatic same-URL mask shares transport and deterministically publishes image then geometry in either extension order", async () => {
  for (const reverse of [false, true]) {
    const f = selected();
    const output = layoutPrepared(
      await prepareDocument(maskTree(Source.url("same.png"), "same.png"), {
        extensions: reverse ? f.extensions.reverse() : f.extensions,
      }),
    );
    assert.equal(f.calls.fetch, 1);
    assert.equal(f.calls.policy, 3);
    assert.deepEqual(Object.keys(output.options.resources), ["Prepared0", "Prepared1"]);
    assert.equal((output.options.resources.Prepared0!.metadata as { kind: string }).kind, "png");
    assert.equal(ownedResourceBytes(output.options.resources.Prepared1!), 180);
    assert.equal(output.placements[0]!.box.height, 80);
    const pdf = Buffer.from(render(output.document, output.options)).toString("latin1");
    assert.equal((pdf.match(/\/X1 Do/gu) ?? []).length, 1);
  }
});
test("mask-only Block retains bytes but never paints or embeds its image; different visual URL and prebound source work", async () => {
  const original = await preparePng(bytes);
  for (const source of [undefined, "visual.png", original]) {
    const f = selected();
    const output = layoutPrepared(
      await prepareDocument(maskTree(Source.url("mask.png"), source), {
        extensions: f.extensions,
        ...(source === original ? { resources: { original } } : {}),
      }),
    );
    assert.equal(f.calls.fetch, source === "visual.png" ? 2 : 1);
    const pdf = Buffer.from(render(output.document, output.options)).toString("latin1");
    assert.equal((pdf.match(/\/X\d+ Do/gu) ?? []).length, source === undefined ? 0 : 1);
    assert.equal((pdf.match(/\/Subtype \/Image/gu) ?? []).length, source === undefined ? 0 : 2);
  }
});
test("missing loading service fails at shape occurrence before transport; JPEG masks reject PNG private authentication", async () => {
  await assert.rejects(
    prepareDocument(maskTree(), { extensions: [textFlow({ handlers: [pngAlphaShapes()] })] }),
    (e: unknown) => e instanceof DocumentError && e.diagnostics[0]!.path.endsWith("/style/shapeOutside"),
  );
  const { loader } = transport(jpeg());
  await assert.rejects(
    prepareDocument(maskTree(), {
      extensions: [textFlow({ handlers: [pngAlphaShapes()] }), images({ loader, formatHandlers: [jpegImages()] })],
    }),
    (e: unknown) =>
      e instanceof DocumentError &&
      e.diagnostics[0]!.code === "RESOURCE" &&
      e.diagnostics[0]!.path.endsWith("/style/shapeOutside"),
  );
});
test("syntax owner runs during capture and invalid syntax/unsupported Path URL masks fail before I/O", async () => {
  const f = selected();
  await assert.rejects(prepareDocument(maskTree("url('mask.png')"), { extensions: f.extensions }), /shapeSyntax/u);
  assert.equal(f.calls.fetch, 0);
  const { loader, calls } = transport(bytes);
  const extensions = [
    images({ loader, formatHandlers: [pngImages()] }),
    textFlow({ handlers: [pngAlphaShapes(), pathShapes(), shapeSyntax()] }),
  ];
  layoutPrepared(await prepareDocument(maskTree("url('mask.png')"), { extensions }));
  assert.equal(calls.fetch, 1);
  layoutPrepared(await prepareDocument(maskTree("polygon(0 0, 40 0, 0 80)"), { extensions }));
  assert.equal(calls.fetch, 1);
  const FloatingPath = floatable(Path);
  await assert.rejects(
    prepareDocument(
      document([
        h(FloatingPath, {
          d: "M0 0H80V80H0Z",
          fill: "blue",
          style: { width: 80, height: 80, float: "left", shapeOutside: Source.url("mask.png") },
        }),
      ]),
      { extensions },
    ),
    /not Path/u,
  );
  assert.equal(calls.fetch, 1);
});
test("PNG metadata helper authenticates before metadata, shares CJS identity and exposes immutable scalars", async () => {
  const image = await preparePng(bytes);
  assert.deepEqual(pngAlphaInfo(image), { width: 2, height: 2, hasAlpha: true });
  assert.ok(Object.isFrozen(pngAlphaInfo(image)));
  assert.throws(
    () =>
      pngAlphaInfo({
        get metadata() {
          return assert.fail("not read");
        },
      } as never),
    DocumentError,
  );
  assert.equal(createRequire(import.meta.url)("@updf/png/alpha").pngAlphaInfo, pngAlphaInfo);
  assert.equal(createRequire(import.meta.url)("@updf/text-flow/png-alpha").pngAlphaShapes, pngAlphaShapes);
  assert.equal(floatable((await import("@updf/images")).Image), FloatingImage);
});
test("canonical occurrence captures caller style and author component once before any resolver await", async () => {
  let authored = 0;
  const style = { width: 80, height: 80, float: "left", shapeOutside: Source.url("same.png"), shapeImageThreshold: 0 };
  const Author = () => {
    authored++;
    return h(FloatingImage, { src: "same.png", style } as never, "captured");
  };
  const f = selected();
  const pending = prepareDocument(document([h(Author, {})]), { extensions: f.extensions });
  style.height = 180;
  style.shapeOutside = Source.url("different.png");
  style.shapeImageThreshold = 1;
  const output = layoutPrepared(await pending);
  assert.equal(authored, 1);
  assert.equal(f.calls.fetch, 1);
  assert.equal(output.placements[0]!.box.height, 80);
  assert.equal(
    (output.options.resources.Prepared1!.metadata as { shape: { shapeImageThreshold: number } }).shape
      .shapeImageThreshold,
    0,
  );
  assert.deepEqual(output.placements[0]!.sourceKeys, ["captured"]);
});
test("selected syntax charges actual capture parsing against the existing source-work owner before I/O", async () => {
  const { loader, calls } = transport(bytes);
  const extensions = [
    textFlow({ handlers: [pngAlphaShapes(), shapeSyntax()] }),
    images({ loader, formatHandlers: [pngImages()] }),
  ];
  await assert.rejects(
    prepareDocument(maskTree(`url('${"x".repeat(300)}')`), { extensions, limits: { nodes: 200 } }),
    (e: unknown) =>
      e instanceof DocumentError &&
      e.diagnostics[0]!.code === "LIMIT" &&
      e.diagnostics[0]!.path.endsWith("/style/shapeOutside"),
  );
  assert.equal(calls.fetch, 0);
});
test("capture source-work authority is revoked before suspended resolution and sealed layout", async () => {
  let charge!: (count: number) => void;
  const syntax = defineHandler({
    kind: "syntax",
    resolve: (_source, captureCharge) => {
      charge = captureCharge;
      charge(1);
      return Source.url("mask.png");
    },
  });
  const { loader } = transport(bytes);
  const load: typeof loader.load = (url, options) => {
    assert.throws(
      () => charge(1),
      (e: unknown) => e instanceof DocumentError && e.diagnostics[0]!.code === "PHASE",
    );
    return loader.load(url, options);
  };
  const extensions = [
    textFlow({ handlers: [pngAlphaShapes(), syntax] }),
    images({ loader: { ...loader, load }, formatHandlers: [pngImages()] }),
  ];
  const prepared = await prepareDocument(maskTree("selected syntax input"), { extensions });
  assert.throws(() => charge(1), DocumentError);
  layoutPrepared(prepared);
  assert.throws(() => charge(1), DocumentError);
});
