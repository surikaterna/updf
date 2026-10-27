import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createContext, h, useContext } from "@updf/core/vdom";
import { images } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { Block, Document, Flow } from "@updf/layout";
import {
  definePreparationResource,
  layoutPrepared,
  prepareDocument,
  replaceParticipationData,
} from "@updf/layout/internal-preparation";
import { preparePng } from "@updf/png";
import { fixture } from "../../png/test/helpers.js";
import { bridgeFixture } from "./bridge-fixture.js";
import { transport } from "./url-helpers.js";

test("metadata capture preserves raw keys, child scopes, unrelated style and nested data across the async boundary", async () => {
  const Theme = createContext(0);
  const values: number[] = [];
  const Child = () => {
    values.push(useContext(Theme));
    return h(Block, { style: { height: 3 }, children: null });
  };
  const shared = h(Child, {});
  const f = bridgeFixture(true);
  const style = { width: 30, height: 20, paddingLeft: 1.25 };
  const children = [7, 11].map((value) =>
    h(Theme.Provider, {
      value,
      children: h(f.Marker, { mask: "mask.png", style, children: shared }, `key-${value}`),
    }),
  );
  const feature = definePreparationResource({
    ...f.definition,
    session(context) {
      style.paddingLeft = 9;
      return f.definition.session(context);
    },
  });
  const { loader } = transport();
  layoutPrepared(
    await prepareDocument(
      h(Document, {
        children: h(Flow, {
          pageSize: { width: 200, height: 200 },
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
          participation: f.owner,
          children,
        }),
      }),
      { extensions: [feature, images({ loader, formatHandlers: [pngImages()] })] },
    ),
  );
  assert.deepEqual(values, [7, 11]);
  assert.equal(f.count(), 2);
  assert.deepEqual(
    f.seen.map(({ key }) => key),
    ["key-7", "key-11"],
  );
  assert.ok(f.captures.every(({ props }) => props.style!.paddingLeft === 1.25));
  assert.ok(f.captures.every(({ data }) => Object.isFrozen((data as { depth: object }).depth)));
});

test("abort during second-slot resolution closes all captures and never publishes a prepared document", async () => {
  const f = bridgeFixture();
  const controller = new AbortController();
  const resource = await preparePng(fixture());
  let closed = 0;
  const feature = definePreparationResource({
    ...f.definition,
    session() {
      return {
        async resolve() {
          controller.abort();
          return resource;
        },
        close() {
          closed++;
        },
      };
    },
  });
  const { loader } = transport();
  await assert.rejects(
    prepareDocument(
      f.document({ src: "visual.png", mask: "mask.png", style: { width: 30, height: 20 } }),
      {
        extensions: [feature, images({ loader, formatHandlers: [pngImages()] })],
      },
      { signal: controller.signal },
    ),
    DocumentError,
  );
  assert.equal(closed, 1);
  assert.equal(f.seen.length, 0);
  assert.throws(() => replaceParticipationData(f.captures[0]!, resource, "Prepared0", {}), DocumentError);
});
