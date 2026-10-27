import assert from "node:assert/strict";
import { name } from "@updf/core/pdf";
import { semanticComponent, validateDataObject } from "@updf/core/internal";
import {
  createOwnedResource,
  resourceSlot,
  xObjectSlot,
  type OwnedResource,
  type ResourceProvider,
} from "@updf/core/resources";
import { h, type VDOMChild } from "@updf/core/vdom";
import {
  type BlockContent,
  createExtensions,
  defineBlockAdapter,
  Document,
  extension,
  Flow,
  type MeasureContext,
} from "@updf/layout";
import { definePreparationResource } from "@updf/layout/internal-preparation";

export const owned = () => createOwnedResource({ kind: "stage-test" }, { byteLength: 7 });
export const authored = (children: VDOMChild) =>
  h(Document, {
    children: h(Flow, {
      pageSize: { width: 200, height: 200 },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      children: children as BlockContent,
    }),
  });

export function resourceFixture(
  resolve: (request: string) => Promise<OwnedResource>,
  measured: (context: MeasureContext) => void = () => {},
) {
  const identity = Object.freeze({});
  const Leaf = semanticComponent<{ url: string }>(identity, true);
  const adapter = defineBlockAdapter<{ id: string; resource: OwnedResource }>({
    name: "PreparationTest",
    validate: (value) => value as { id: string; resource: OwnedResource },
    measure(props, context) {
      measured(context);
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: context.width, height: 4 },
        next: () => ({
          end: 1,
          height: 4,
          nodes: [{ type: "xObject", resource: props.id, x: 0, y: 0, width: context.width, height: 4 }],
        }),
      };
    },
  });
  const feature = definePreparationResource({
    identity,
    capture(props, path) {
      validateDataObject(props, ["url"], path);
      assert.equal(typeof props.url, "string");
      return props.url as string;
    },
    resolve,
    replace: (_request, resource, id) => extension(adapter, { resource, id }),
  });
  return { Leaf, feature, adapters: createExtensions([adapter]) };
}

export function formProvider(resource: OwnedResource): ResourceProvider {
  const slot = resourceSlot<null>();
  return {
    slot,
    collectXObject(site, collection) {
      if (site.resource !== resource) return;
      const handle = collection.intern(slot, site.resource, () => ({
        category: "XObject",
        payload: null,
        phase: "content",
        reserve(writer) {
          const ref = writer.reserve();
          return {
            ref,
            define: () =>
              writer.defineStream(ref, ["0 0 1 1 re f\n"], {
                Type: name("XObject"),
                Subtype: name("Form"),
                BBox: [0, 0, 1, 1],
              }),
          };
        },
      }));
      collection.bindPainting(site.identity, xObjectSlot, { resource: handle, finish: () => null });
    },
  };
}
