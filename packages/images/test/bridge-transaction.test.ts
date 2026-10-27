import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { h } from "@updf/core/vdom";
import { ownedResourceBytes, type OwnedResource } from "@updf/core/resources";
import { images } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { Block } from "@updf/layout";
import {
  definePreparationResource,
  layoutPrepared,
  prepareDocument,
  replaceParticipationData,
  replaceVisualResource,
} from "@updf/layout/internal-preparation";
import { preparePng } from "@updf/png";
import { fixture } from "../../png/test/helpers.js";
import { bridgeFixture } from "./bridge-fixture.js";
import { transport } from "./url-helpers.js";

test("one canonical Image occurrence resolves both slots in fixed order and retains masks without painting them", async () => {
  for (const reversed of [false, true])
    for (const same of [false, true]) {
      const f = bridgeFixture();
      const { loader, calls } = transport();
      const extensions = [f.feature, images({ loader, formatHandlers: [pngImages()] })];
      const output = layoutPrepared(
        await prepareDocument(
          f.document({
            src: "visual.png",
            mask: same ? "visual.png" : "mask.png",
            style: { width: 30, height: 20 },
          }),
          { extensions: reversed ? extensions.reverse() : extensions },
        ),
      );
      assert.equal(f.count(), 1);
      assert.equal(f.seen.length, 1);
      assert.equal(f.seen[0]!.key, "owned");
      assert.equal(f.seen[0]!.path, "/document/children/children");
      assert.deepEqual((f.seen[0]!.data as { depth: object }).depth, { untouched: 7 });
      assert.equal((f.seen[0]!.data as { id: string }).id, same ? "Prepared0" : "Prepared1");
      assert.equal(calls.fetch, same ? 1 : 2);
      assert.equal(calls.policy, same ? 3 : 4);
      assert.equal(Object.keys(output.options.resources).length, same ? 1 : 2);
      const pdf = new TextDecoder().decode(await render(output.document, output.options));
      assert.equal((pdf.match(/\/Subtype \/Image\b/gu) ?? []).length, 2); // Color image plus its alpha mask, not the retained metadata PNG.
      assert.throws(
        () => replaceParticipationData(f.captures[0]!, output.options.resources.Prepared0!, "Prepared0", {}),
        DocumentError,
      );
    }
});

test("prepared Image plus URL metadata and plain Block metadata need no visual request", async () => {
  const src = await preparePng(fixture());
  for (const plain of [false, true]) {
    const f = bridgeFixture(plain);
    const { loader, calls } = transport();
    const body = h(Block, { style: { height: 3 }, children: null });
    const props = { mask: "mask.png", style: { width: 30, height: 20 }, ...(plain ? { children: body } : { src }) };
    const output = layoutPrepared(
      await prepareDocument(f.document(props), {
        extensions: [f.feature, images({ loader, formatHandlers: [pngImages()] })],
        ...(plain ? {} : { resources: { original: src } }),
      }),
    );
    assert.equal(f.count(), 1);
    assert.equal(calls.fetch, 1);
    assert.equal(calls.policy, 2);
    assert.deepEqual(
      f.references[0],
      plain ? { x: 0, y: 0, width: 30, height: 20 } : { x: 5, y: 0, width: 20, height: 20 },
    );
    await render(output.document, output.options);
  }
});

test("duplicate slot claims reject before sessions or I/O, including default/explicit visual claims", async () => {
  const f = bridgeFixture();
  const { loader, calls } = transport();
  await assert.rejects(
    prepareDocument(f.document({ src: "visual.png", mask: "mask.png", style: { width: 30, height: 20 } }), {
      extensions: [
        f.feature,
        definePreparationResource(f.definition),
        images({ loader, formatHandlers: [pngImages()] }),
      ],
    }),
    DocumentError,
  );
  assert.equal(calls.fetch, 0);
});

test("retained second-slot resources are charged before metadata replacement", async () => {
  const f = bridgeFixture();
  const { loader } = transport();
  const one = await preparePng(fixture());
  await assert.rejects(
    prepareDocument(f.document({ src: "visual.png", mask: "mask.png", style: { width: 30, height: 20 } }), {
      limits: { resourceBytes: ownedResourceBytes(one) * 2 - 1 },
      extensions: [f.feature, images({ loader, formatHandlers: [pngImages()] })],
    }),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]!.code === "LIMIT",
  );
  assert.equal(f.seen.length, 0);
});

test("slot helpers reject copies, wrong slots, wrong resources/ids, replay and cross-occurrence captures", async () => {
  const f = bridgeFixture();
  const other = await preparePng(fixture());
  const definition = {
    ...f.definition,
    replace(request: Parameters<typeof replaceParticipationData>[0], resource: OwnedResource, id: string) {
      assert.throws(() => replaceParticipationData({ ...request }, resource, id, {}), DocumentError);
      assert.throws(() => replaceParticipationData(request, other, id, {}), DocumentError);
      assert.throws(() => replaceParticipationData(request, resource, "wrong", {}), DocumentError);
      assert.throws(() => replaceVisualResource(request, resource, id), DocumentError);
      const token = replaceParticipationData(request, resource, id, { ...request.data, id });
      assert.throws(() => replaceParticipationData(request, resource, id, {}), DocumentError);
      return token;
    },
  };
  const { loader } = transport();
  layoutPrepared(
    await prepareDocument(f.document({ src: "visual.png", mask: "mask.png", style: { width: 30, height: 20 } }), {
      extensions: [definePreparationResource(definition), images({ loader, formatHandlers: [pngImages()] })],
    }),
  );
});

test("second-slot failure never returns a prepared document or starts layout", async () => {
  const f = bridgeFixture();
  const expected = new Error("metadata failed");
  const broken = definePreparationResource({
    ...f.definition,
    session() {
      return {
        resolve: async () => {
          throw expected;
        },
        close() {},
      };
    },
  });
  const { loader } = transport();
  await assert.rejects(
    prepareDocument(f.document({ src: "visual.png", mask: "mask.png", style: { width: 30, height: 20 } }), {
      extensions: [broken, images({ loader, formatHandlers: [pngImages()] })],
    }),
    (error) => error === expected,
  );
  assert.equal(f.seen.length, 0);
});
