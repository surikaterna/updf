import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { createOperationCapability, defineOperationExtension, validateDataObject } from "@updf/core/internal";
import type { OwnedResource } from "@updf/core/resources";
import { createContext, h, useContext, type VDOMChild } from "@updf/core/vdom";
import { jsx } from "@updf/core/jsx-runtime";
import { Block, Column, Row, layout, type BlockStyle, type BlockContent } from "@updf/layout";
import { defineVisual } from "@updf/layout/internal-visual";
import {
  definePreparationResource,
  layoutPrepared,
  prepareDocument,
  replaceVisualResource,
  type CapturedVisualResource,
} from "@updf/layout/internal-preparation";
import { floatable, textFlow } from "@updf/text-flow";
import { pathShapes } from "@updf/text-flow/path";
import { Source } from "@updf/text-flow/sources";
import { preparePng, pngProvider } from "@updf/png";
import { fixture as pngFixture } from "../../png/test/helpers.js";
import { ledger } from "../../core/dist/cjs/measurement/ledger.js";
import { policy } from "../../core/dist/cjs/core/policy.js";
import { operationState } from "../../core/dist/cjs/vdom/operation-state.js";
import { layoutOperation } from "../../core/dist/cjs/core/layout-operation.js";
import { emptyTextResources } from "../../core/dist/cjs/core/text-resources.js";
import { ownOperationExtensions } from "../../core/dist/cjs/core/operation-extension.js";
import { normalizeScoped } from "../../core/dist/cjs/vdom/normalize.js";
import { preparationControls } from "../../core/dist/cjs/vdom/preparation.js";
import { preparationResources } from "../dist/cjs/preparation-resource.js";
import { authored, formProvider, owned } from "./preparation-fixture.js";

function fixture(replace = replaceVisualResource, resource = owned()) {
  const paths: string[] = [];
  let captures = 0,
    measures = 0,
    requests = 0;
  const visual = defineVisual<
    { src: string | OwnedResource; style: BlockStyle; body?: BlockContent },
    { src: string | OwnedResource; id?: string; body?: BlockContent }
  >({
    name: "PreparedVisual",
    capture(input, path) {
      captures++;
      validateDataObject(input, ["src", "style", "body"], path);
      return {
        props: { style: input.style as BlockStyle },
        visual: {
          src: input.src as string | OwnedResource,
          ...(input.body === undefined ? {} : { body: input.body as BlockContent }),
        },
      };
    },
    prepare: (value, src, id) => ({ ...value, src, id }),
    measure: visualMeasure(resource, () => measures++, paths),
  });
  const { feature, captured } = resourceFeature(
    visual.preparationOwner,
    resource,
    () => {
      requests++;
      assert.equal(measures, 0);
    },
    replace,
  );
  const install = defineOperationExtension(
    {},
    createOperationCapability(() => () => null),
    visual.adapters,
  );
  return {
    ...visual,
    feature,
    resource,
    captured,
    paths,
    options: { extensions: [install, feature, textFlow()], providers: [formProvider(resource)] },
    counts: () => ({ captures, measures, requests }),
  };
}
function visualMeasure(resource: OwnedResource, measured: () => void, paths: string[]) {
  return (
    props: { readonly src: string | OwnedResource; readonly body?: BlockContent },
    context: import("@updf/layout").MeasureContext,
  ) => {
    measured();
    paths.push(context.sourcePath);
    assert.equal(props.src, resource);
    if (props.body) context.measureContent(props.body, { width: context.width });
    return {
      fragmentation: "atomic" as const,
      extent: 1,
      naturalSize: { width: context.width, height: 4 },
      next: () => ({
        end: 1,
        height: 4,
        nodes: [{ type: "xObject" as const, resource: "Prepared0", x: 0, y: 0, width: context.width, height: 4 }],
      }),
    };
  };
}
function resourceFeature(
  identity: object,
  resource: OwnedResource,
  requested: () => void,
  replace = replaceVisualResource,
) {
  const captured: CapturedVisualResource[] = [];
  const feature = definePreparationResource({
    identity,
    capture(_props, _path, capture) {
      assert.ok(capture);
      assert.equal(capture.visual.src, "test://placeholder");
      captured.push(capture);
      requested();
      return capture;
    },
    async resolve() {
      await Promise.resolve();
      return resource;
    },
    replace,
  });
  return { feature, captured };
}
const style = { width: 20, height: 14, padding: 2, backgroundColor: [0, 1, 0] as const };

test("ordinary and floated generic visuals share preparation ownership without losing Block geometry or keys", async () => {
  const f = fixture();
  const Floating = floatable(f.Component);
  const tree = (src: string | OwnedResource) =>
    authored([
      jsx(f.Component, { src, style }, "ordinary"),
      jsx(Floating, { src, style: { ...style, float: "right" } }, "floating"),
    ]);
  const pending = prepareDocument(tree("test://placeholder"), f.options);
  assert.deepEqual(f.counts(), { captures: 2, measures: 0, requests: 2 });
  const handle = await pending;
  assert.equal(f.counts().measures, 0);
  const result = layoutPrepared(handle);
  assert.deepEqual(f.counts(), { captures: 2, measures: 2, requests: 2 });
  const options = {
    ...f.options,
    extensions: f.options.extensions.filter((value) => value !== f.feature),
    resources: { Prepared0: f.resource },
  };
  const control = layout(tree(f.resource), options);
  assert.deepEqual(f.paths.slice(0, 2), f.paths.slice(2));
  assert.ok(f.paths.every((path) => !path.includes("/expanded")));
  assert.deepEqual(result.document, control.document);
  assert.deepEqual(result.placements, control.placements);
  assert.deepEqual(render(result.document, result.options), render(control.document, options));
  assert.throws(() => replaceVisualResource(f.captured[0]!, f.resource, "Prepared0"), DocumentError);
});

test("reused VNodes have distinct captures inside direct, kept Body and Column occurrences", async () => {
  const f = fixture();
  const child = jsx(f.Component, { src: "test://placeholder", style }, "shared");
  const tree = authored([
    child,
    h(Block, { keepTogether: true, children: h(Block.Body, { children: child }) }),
    h(Row, { children: h(Column, { children: child }) }),
  ]);
  const result = layoutPrepared(await prepareDocument(tree, f.options));
  assert.deepEqual(f.counts(), { captures: 3, requests: 3, measures: 3 });
  assert.equal(new Set(f.captured).size, 3);
  assert.ok(render(result.document, result.options).length > 100);
});

test("await-time caller style mutation cannot change either canonical captured visual", async () => {
  const f = fixture();
  const raw = { ...style };
  const pending = prepareDocument(authored(h(f.Component, { src: "test://placeholder", style: raw })), f.options);
  raw.height = 90;
  assert.equal(Object.isFrozen(raw), false);
  const result = layoutPrepared(await pending);
  assert.equal(result.placements[0]!.box.height, 14);
});

test("copied and foreign occurrence replacement tokens reject before geometry", async () => {
  let token: ReturnType<typeof replaceVisualResource>;
  for (const copied of [false, true]) {
    let calls = 0;
    const f = fixture((capture, resource, id) => {
      if (++calls === 1) {
        token = replaceVisualResource(capture, resource, id);
        return copied ? { ...token } : token;
      }
      return token;
    });
    await assert.rejects(
      prepareDocument(
        authored([
          h(f.Component, { src: "test://placeholder", style }),
          h(f.Component, { src: "test://placeholder", style }),
        ]),
        f.options,
      ),
      DocumentError,
    );
    assert.equal(f.counts().measures, 0);
  }
});

test("resolved ordinary and floating children retain their original provider scopes and raw keys", async () => {
  const f = fixture();
  const Theme = createContext(0);
  const seen: number[] = [];
  const Child = () => {
    seen.push(useContext(Theme));
    return { type: "spacer", height: 1 } as unknown as VDOMChild;
  };
  const Floating = floatable(f.Component);
  const same = h(Child, {}, "raw-child");
  const tree = (src: string | OwnedResource, explicitScope = false) =>
    authored([
      h(Theme.Provider, { value: 5, children: jsx(f.Component, { src, body: same, style }, "raw-0") }),
      h(Theme.Provider, {
        value: 6,
        children: jsx(
          Floating,
          {
            src,
            body: explicitScope ? h(Theme.Provider, { value: 6, children: same }) : same,
            style: { ...style, float: "left" },
          },
          "raw-1",
        ),
      }),
    ]);
  const result = layoutPrepared(await prepareDocument(tree("test://placeholder"), f.options));
  assert.deepEqual(seen, [5, 6]);
  const control = layout(tree(f.resource, true), { ...f.options, resources: { Prepared0: f.resource } });
  assert.deepEqual(seen, [5, 6, 5, 6]);
  assert.deepEqual(result.placements, control.placements);
  assert.deepEqual(result.document, control.document);
});

test("floating exclusion source and definite styled constraints survive replacement verbatim", async () => {
  const f = fixture();
  const Floating = floatable(f.Component);
  const options = {
    ...f.options,
    extensions: [...f.options.extensions.slice(0, 2), textFlow({ handlers: [pathShapes()] })],
  };
  const tree = (src: string | OwnedResource) =>
    authored(
      jsx(
        Floating,
        {
          src,
          style: {
            ...style,
            float: "left",
            shapeOutside: Source.polygon([0, 0, 20, 0, 0, 14]),
            minWidth: 20,
            maxHeight: 18,
          },
        },
        "shaped",
      ),
    );
  const result = layoutPrepared(await prepareDocument(tree("test://placeholder"), options));
  const control = layout(tree(f.resource), { ...options, resources: { Prepared0: f.resource } });
  assert.deepEqual(result.document, control.document);
  assert.deepEqual(result.placements, control.placements);
});

test("an already prepared PNG returned by the fake resolver uses the existing provider without a loader", async () => {
  const resource = await preparePng(pngFixture());
  const f = fixture(replaceVisualResource, resource);
  const options = { ...f.options, providers: [pngProvider()] };
  const tree = (src: string | OwnedResource) => authored(h(f.Component, { src, style }));
  const result = layoutPrepared(await prepareDocument(tree("test://placeholder"), options));
  const baselineOptions = { ...options, resources: { Prepared0: resource } };
  const control = layout(tree(resource), baselineOptions);
  assert.deepEqual(render(result.document, result.options), render(control.document, baselineOptions));
});

test("forged captures, incorrect binding IDs and post-failure captures reject without geometry or getters", async () => {
  let getters = 0;
  const fake = Object.defineProperty({}, "props", {
    get() {
      getters++;
      return {};
    },
  });
  assert.throws(() => replaceVisualResource(fake as CapturedVisualResource, owned(), "Prepared0"), DocumentError);
  assert.equal(getters, 0);
  const f = fixture((capture, resource) => replaceVisualResource(capture, resource, "wrong"));
  await assert.rejects(
    prepareDocument(authored(h(f.Component, { src: "test://placeholder", style })), f.options),
    DocumentError,
  );
  assert.equal(f.counts().measures, 0);
  assert.throws(() => replaceVisualResource(f.captured[0]!, f.resource, "Prepared0"), DocumentError);
});

test("marker installation and preparation identity conflicts keep structured failure behavior", async () => {
  const f = fixture();
  const Floating = floatable(f.Component);
  const child = authored(h(Floating, { src: "test://placeholder", style: { ...style, float: "left" } }));
  await assert.rejects(
    prepareDocument(child, { ...f.options, extensions: f.options.extensions.slice(0, 2) }),
    DocumentError,
  );
  const duplicate = definePreparationResource({
    identity: f.preparationOwner,
    capture: () => null,
    resolve: async () => f.resource,
    replace: () => {
      throw new Error("must not run");
    },
  });
  await assert.rejects(
    prepareDocument(child, { ...f.options, extensions: [...f.options.extensions, duplicate] }),
    DocumentError,
  );
  assert.equal(f.counts().measures, 0);
});

test("mapped capture charges raw and canonical occurrences before resource callbacks, without uncharged traversal", () => {
  for (const limit of [21, 22]) {
    const f = fixture();
    const state = operationState(emptyTextResources, ledger(policy({ limits: { nodes: limit } })));
    const controls = preparationControls(state);
    const resources = preparationResources(
      ownOperationExtensions([f.feature]).map((value) => value.contribution),
      layoutOperation(emptyTextResources, state.budget, () => true, state),
    );
    controls.recipes((recipe, path, snapshot) => resources.capture(recipe, path, true, snapshot));
    const capture = () =>
      normalizeScoped(
        h(f.Component, { src: "test://placeholder", style }),
        state,
        () => {
          throw new Error("no data recipes");
        },
        "/visual",
      );
    if (limit === 21) assert.throws(capture, DocumentError);
    else {
      capture();
      assert.equal(state.sourceNodes, 22);
      assert.equal(state.budget.units, 22);
      assert.equal(state.budget.chars, 18);
    }
    assert.equal(f.counts().requests, limit === 21 ? 0 : 1);
    assert.equal(f.counts().measures, 0);
    resources.close();
    controls.close();
  }
});
