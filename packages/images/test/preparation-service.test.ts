import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { DocumentError } from "@updf/core";
import { h } from "@updf/core/vdom";
import { ownedResourceBytes } from "@updf/core/resources";
import { Image, images as preparedImages } from "@updf/images";
import { images } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { resolveImageResource, imagePreparationService } from "@updf/images/internal-preparation";
import {
  layoutPrepared,
  prepareDocument,
  readPreparationService,
  type PreparationContext,
} from "@updf/layout/internal-preparation";
import { preparePng } from "@updf/png";
import { authored } from "../../layout/test/preparation-fixture.js";
import { fixture } from "../../png/test/helpers.js";
import { transport } from "./url-helpers.js";
import { serviceFixture } from "./preparation-service-fixture.js";

const image = (src: Parameters<typeof Image>[0]["src"]) => h(Image, { src, style: { width: 20, height: 20 } });

test("image preparation service shares one session in either extension order and retains first aliases", async () => {
  for (const reversed of [false, true]) {
    const { loader, calls } = transport();
    const metadata = serviceFixture(async (context, path) => {
      const first = await resolveImageResource(context, "logo.png", path);
      const second = await resolveImageResource(context, "logo.png", `${path}/again`);
      assert.equal(first, second);
      assert.equal(context.retain(first, path), "Prepared0");
      assert.equal(context.retain(second, path), "Prepared0");
      return first;
    });
    const selected = [metadata.feature, images({ loader, formatHandlers: [pngImages()] })];
    const output = layoutPrepared(
      await prepareDocument(authored([image("logo.png"), h(metadata.Leaf, {})]), {
        extensions: reversed ? selected.reverse() : selected,
      }),
    );
    assert.deepEqual(Object.keys(output.options.resources), ["Prepared0"]);
    assert.equal(calls.fetch, 1);
    assert.equal(calls.policy, 4); // Three fields plus the asset owner's one transport policy check.
    assert.equal(output.options.providers.length, 1);
  }
});

test("metadata-only requests initialize the selected image service without an Image src request", async () => {
  for (const prebound of [false, true]) {
    const { loader, calls } = transport();
    const original = await preparePng(fixture());
    const metadata = serviceFixture((context, path) => resolveImageResource(context, "mask.png", path));
    const output = layoutPrepared(
      await prepareDocument(authored([...(prebound ? [image(original)] : []), h(metadata.Leaf, {})]), {
        resources: prebound ? { logo: original } : {},
        extensions: [metadata.feature, images({ loader, formatHandlers: [pngImages()] })],
      }),
    );
    assert.equal(calls.fetch, 1);
    assert.equal(calls.policy, 2);
    assert.deepEqual(Object.keys(output.options.resources), prebound ? ["logo", "Prepared0"] : ["Prepared0"]);
  }
});

test("prepared-only images do not install a URL service; lookup fails at the metadata source path", async () => {
  const { calls } = transport();
  const metadata = serviceFixture((context, path) => resolveImageResource(context, "mask.png", path));
  await assert.rejects(
    prepareDocument(authored(h(metadata.Leaf, {})), { extensions: [metadata.feature, preparedImages()] }),
    (error: unknown) => {
      assert.ok(error instanceof DocumentError);
      assert.equal(error.diagnostics[0]!.code, "PHASE");
      assert.equal(error.diagnostics[0]!.path, "/document/children/children/mask");
      return true;
    },
  );
  assert.equal(calls.fetch, 0);
});

test("service lookup, captured resolver and retain authority expire before sealed layout", async () => {
  const { loader, calls } = transport();
  let saved!: PreparationContext;
  let late!: () => Promise<unknown>;
  const metadata = serviceFixture(async (context, path) => {
    saved = context;
    const resolver = readPreparationService(context, imagePreparationService, path);
    late = () => resolver("late.png", path);
    return resolver("mask.png", path);
  });
  const handle = await prepareDocument(authored(h(metadata.Leaf, {})), {
    extensions: [metadata.feature, images({ loader, formatHandlers: [pngImages()] })],
  });
  assert.throws(() => readPreparationService(saved, imagePreparationService, "/late"), DocumentError);
  const output = layoutPrepared(handle);
  assert.throws(() => saved.retain(output.options.resources.Prepared0!, "/late"), DocumentError);
  await assert.rejects(late(), DocumentError);
  assert.equal(calls.fetch, 1);
});

test("retention charges unused distinct mask resources before the metadata consumer continues", async () => {
  const original = await preparePng(fixture());
  const { loader } = transport();
  let continued = false;
  const metadata = serviceFixture(async (context, path) => {
    const mask = await resolveImageResource(context, "mask.png", path);
    context.retain(mask, path);
    continued = true;
    return mask;
  });
  await assert.rejects(
    prepareDocument(authored(h(metadata.Leaf, {})), {
      resources: { original },
      limits: { resourceBytes: ownedResourceBytes(original) * 2 - 1 },
      extensions: [metadata.feature, images({ loader, formatHandlers: [pngImages()] })],
    }),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]!.code === "LIMIT",
  );
  assert.equal(continued, false);
});

test("image preparation service identity is shared across import and require leaves", () => {
  const required = createRequire(import.meta.url)("@updf/images/internal-preparation");
  assert.equal(required.imagePreparationService, imagePreparationService);
});
