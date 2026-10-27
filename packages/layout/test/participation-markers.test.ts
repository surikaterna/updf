import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { h } from "@updf/core/vdom";
import { Block, Document, Flow, layout, type ContentBlockProps } from "@updf/layout";
import {
  defineParticipation,
  participationComponent,
  type ParticipationSource,
} from "@updf/layout/internal-participation";
import { markerParticipation } from "../dist/cjs/participation.js";

const region = { pageSize: { width: 100, height: 100 }, margins: { top: 0, right: 0, bottom: 0, left: 0 } };
test("multiple owned markers capture raw props once without replacing identities or authored provenance", () => {
  const seen: ParticipationSource[] = [];
  const captures: unknown[] = [];
  const owner = defineParticipation((sources, context) => {
    seen.push(...sources);
    return { blocks: sources.map((source) => context.prepare(source)), close() {} };
  });
  const create = (kind: string) =>
    participationComponent<ContentBlockProps>(owner, (props, path) => {
      captures.push({ kind, props, path });
      return { props: props as unknown as ContentBlockProps, data: { kind } };
    });
  const A = create("a"),
    B = create("b");
  const children = [
    h(A, { style: { height: 10 }, children: null }, "first"),
    h(B, { style: { height: 20 }, children: null }, "second"),
  ];
  layout(h(Document, { children: h(Flow, { ...region, participation: owner, children }) }));
  assert.deepEqual(
    seen.map((source) => [source.key, source.path, source.data]),
    [
      ["first", "/document/children/children/0", { kind: "a" }],
      ["second", "/document/children/children/1", { kind: "b" }],
    ],
  );
  assert.equal(captures.length, 2);
});
test("marker roles preserve nested Block validation and reject missing or conflicting owners", () => {
  const create = () => {
    const owner = defineParticipation((sources, context) => ({
      blocks: sources.map((source) => context.prepare(source)),
      close() {},
    }));
    const Marker = participationComponent<ContentBlockProps>(owner, (props) => ({
      props: props as unknown as ContentBlockProps,
      data: {},
    }));
    return { owner, Marker };
  };
  const a = create(),
    b = create();
  assert.equal(markerParticipation({ identity: a.owner, props: {} }), undefined);
  assert.equal(markerParticipation({ identity: { ...a.owner }, props: {} }), undefined);
  const document = (children: unknown, participation?: typeof a.owner) =>
    h(Document, {
      children: h(Flow, { ...region, ...(participation ? { participation } : {}), children: children as never }),
    });
  assert.throws(() => layout(document(h(a.Marker, { children: null }))), /extension/u);
  assert.throws(
    () => layout(document([h(a.Marker, { children: null }), h(b.Marker, { children: null })], a.owner)),
    /Conflicting/u,
  );
  assert.doesNotThrow(() =>
    layout(document(h(a.Marker, { children: h(Block, { style: { height: 1 }, children: null }) }), a.owner)),
  );
  assert.throws(() => layout(document(null, { ...a.owner })), DocumentError);
});
