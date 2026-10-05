import assert from "node:assert/strict";
import test from "node:test";
import { snapshotData } from "@updf/core/internal";
import { createOwnedResource, isOwnedResource, type OwnedResource, ownedResourceBytes } from "@updf/core/resources";
import { h, lower } from "@updf/core/vdom";
import { operation } from "../dist/cjs/core/operation.js";
import { sameData as equivalent } from "../dist/cjs/vdom/equality.js";

test("owned resources snapshot deeply frozen data and preserve identity through source snapshots", () => {
  const input = { kind: "example", values: [{ size: 1 }] };
  const resource = createOwnedResource(input);
  input.values[0]!.size = 2;
  assert.equal(resource.metadata.values[0]?.size, 1);
  assert.ok(Object.isFrozen(resource) && Object.isFrozen(resource.metadata.values[0]));
  assert.equal(snapshotData({ resource }, "/props").resource, resource);
  assert.equal(isOwnedResource(resource), true);
  assert.equal(isOwnedResource({ ...resource }), false);
  assert.equal(equivalent(resource, createOwnedResource(resource.metadata)), false);
  assert.equal(equivalent(resource, resource), true);
  let captured: unknown;
  const node = h(
    (props: { resource: typeof resource }) => {
      captured = props.resource;
      return null;
    },
    { resource },
  );
  lower(h("document", { version: 1, children: h("page", { width: 10, height: 10, children: node }) }));
  assert.equal(captured, resource);
});

test("private byte counts validate storage options, ignore metadata and count unused generic identities once", () => {
  const options = { byteLength: 5 };
  const resource = createOwnedResource({ byteLength: 1000 }, options);
  options.byteLength = 2000;
  assert.equal(ownedResourceBytes(resource), 5);
  assert.equal(ownedResourceBytes(createOwnedResource({ byteLength: 1000 })), 0);
  assert.throws(() => ownedResourceBytes({ ...resource } as OwnedResource));
  for (const byteLength of [-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => createOwnedResource({}, { byteLength }));
  let calls = 0;
  const accessor = Object.defineProperty({}, "byteLength", {
    get() {
      calls++;
      return 1;
    },
  });
  assert.throws(() => createOwnedResource({}, accessor));
  assert.equal(calls, 0);
  const inherited = Object.create({ byteLength: 100 });
  assert.throws(() => createOwnedResource({}, inherited));
  assert.doesNotThrow(() =>
    operation({ resources: { Image: resource, Alias: resource }, limits: { resourceBytes: 5 } }),
  );
  assert.throws(() => operation({ resources: { Image: resource }, limits: { resourceBytes: 4 } }));
  assert.throws(() =>
    operation({
      resources: { Image: createOwnedResource({}, { byteLength: 8 * 1024 * 1024 + 1 }) },
      profile: "service",
    }),
  );
});

test("owned metadata rejects callbacks, accessors, cycles, class instances and mutable storage without getters", () => {
  let calls = 0;
  const accessor = Object.defineProperty({}, "value", {
    enumerable: true,
    get() {
      calls++;
      return 1;
    },
  });
  const cycle: { self?: unknown } = {};
  cycle.self = cycle;
  for (const value of [
    () => 1,
    { callback: () => 1 },
    accessor,
    cycle,
    new Date(),
    new Map(),
    new Set(),
    new Uint8Array(1),
  ])
    assert.throws(() => createOwnedResource(value));
  assert.equal(calls, 0);
});
