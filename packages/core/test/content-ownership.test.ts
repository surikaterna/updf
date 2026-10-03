import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { isContentData, ownContentData } from "@updf/core/internal";
import { createContext } from "@updf/core/vdom";

test("D: internal content capture cannot mint mutable/callback/cyclic capabilities or bypass context restrictions", () => {
  const rejects = (callback: () => unknown) => assert.throws(callback, DocumentError);
  const child = { text: "mutable" };
  rejects(() => ownContentData(Object.freeze({ child })));
  assert.equal(Object.isFrozen(child), false);
  rejects(() => ownContentData(Object.freeze({ callback: () => null })));
  const cycle: { self?: object } = {};
  cycle.self = cycle;
  Object.freeze(cycle);
  rejects(() => ownContentData(cycle));
  rejects(() => ownContentData(Object.freeze({ bytes: new Uint8Array(1) })));
  const data = ownContentData(Object.freeze({ text: "immutable" }));
  assert.ok(isContentData(data));
  assert.equal(isContentData({ ...data }), false);
  rejects(() => createContext(data));
});
