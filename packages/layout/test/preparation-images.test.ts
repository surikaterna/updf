import assert from "node:assert/strict";
import test from "node:test";
import { render } from "@updf/core";
import {
  createOperationCapability,
  defineOperationExtension,
  semanticComponent,
  validateDataObject,
} from "@updf/core/internal";
import { h } from "@updf/core/vdom";
import { Image, images } from "@updf/images";
import { createExtensions, defineBlockAdapter, extension, layout, Paragraph, Span } from "@updf/layout";
import { definePreparationResource, layoutPrepared, prepareDocument } from "@updf/layout/internal-preparation";
import { pngProvider, preparePng } from "@updf/png";
import { floatable, textFlow } from "@updf/text-flow";
import { pathShapes } from "@updf/text-flow/path";
import { Source } from "@updf/text-flow/sources";
import { textOptions } from "../../../tests/fixtures/text-options.js";
import { fixture } from "../../png/test/helpers.js";
import { authored } from "./preparation-fixture.js";

function imageBridge(src: Awaited<ReturnType<typeof preparePng>>, measured: () => void) {
  return defineBlockAdapter({
    name: "PreparedImageBridge",
    validate: (value) => value,
    measure(_props, context) {
      measured();
      const actual = context.measureContent(h(Image, { src, fit: "fill", style: { width: 20, height: 20 } }), {
        width: context.width,
      });
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: actual.size,
        next: () => ({ end: 1, height: actual.size.height, nodes: actual.nodes }),
      };
    },
  });
}

// Codec work is outside capture/resolution/layout; S5b.1 installs no decoder or URL loader.
test("a test resolver returns an already prepared PNG; existing Images sees its generated binding after seal", async () => {
  const src = await preparePng(fixture());
  let geometry = 0;
  const adapter = imageBridge(src, () => {
    geometry++;
  });
  const identity = {};
  const Leaf = semanticComponent<{ request: string }>(identity, true);
  const feature = definePreparationResource({
    identity,
    capture(props, path) {
      validateDataObject(props, ["request"], path);
      return props.request;
    },
    async resolve() {
      assert.equal(geometry, 0);
      await Promise.resolve();
      return src;
    },
    replace(_request, resource) {
      assert.equal(resource, src);
      return extension(adapter, {});
    },
  });
  const options = {
    providers: [pngProvider()],
    extensions: [
      feature,
      images(),
      defineOperationExtension(
        {},
        createOperationCapability(() => () => null),
        createExtensions([adapter]),
      ),
    ],
  };
  const pending = prepareDocument(authored(h(Leaf, { request: "test:already-owned-png" })), options);
  assert.equal(geometry, 0);
  const handle = await pending;
  assert.equal(geometry, 0);
  const result = layoutPrepared(handle);
  assert.ok(geometry > 0);
  assert.equal(result.options.resources.Prepared0, src);
  const bytes = render(result.document, result.options);
  const controlOptions = { ...options, resources: { Prepared0: src } };
  const control = layout(authored(extension(adapter, {}) as never), controlOptions);
  assert.deepEqual(result.document, control.document);
  assert.deepEqual(bytes, render(control.document, controlOptions));
});

test("existing prepared Images and manual FloatPath sources keep normal layout, placement and PDF bytes", async () => {
  const src = await preparePng(fixture());
  const base = textOptions({});
  const options = {
    ...base,
    resources: { ...base.resources, logo: src },
    providers: [...(base.providers ?? []), pngProvider()],
    extensions: [images(), textFlow({ handlers: [pathShapes()] })],
  };
  const FloatingImage = floatable(Image);
  const input = authored([
    h(FloatingImage, {
      src,
      style: { width: 40, height: 40, float: "left", shapeOutside: Source.polygon([0, 0, 40, 0, 0, 40]) },
    }),
    h(Paragraph, { children: ["around ", h(Span, { children: "prepared image " }), "body text ".repeat(20)] }),
  ]);
  const prepared = layoutPrepared(await prepareDocument(input, options));
  const baseline = layout(input, options);
  assert.deepEqual(prepared.document, baseline.document);
  assert.deepEqual(prepared.placements, baseline.placements);
  assert.deepEqual(render(prepared.document, prepared.options), render(baseline.document, options));
});
