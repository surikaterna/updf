import assert from "node:assert/strict";
import { createFragmentOperation, type ProviderWork } from "../src/fragmentation.js";

function retainedOperation(poison: boolean) {
  const descriptor = Buffer.alloc(1024 * 1024);
  const providerResource = Buffer.alloc(1024 * 1024);
  const viewResource = Buffer.alloc(1024 * 1024);
  let handle: ProviderWork | undefined;
  const op = createFragmentOperation({
    next: (_, { offset }, work) => {
      handle = work;
      return { end: offset + 1, height: 0, content: providerResource };
    },
  });
  const source = {
    id: "a",
    path: "/a",
    descriptor,
    extent: 3,
    mode: "splittable" as const,
    width: { mode: "reflow" as const },
  };
  const prepared = op.prepare(source);
  const cursor = op.start({
    count: 1,
    at: () => {
      assert.equal(viewResource.length, 1024 * 1024);
      return source;
    },
  });
  op.select(prepared, { offset: 0, width: 10, height: 0, usedHeight: 0 });
  if (poison) assert.throws(() => op.select({} as typeof prepared, { offset: 0, width: 10, height: 0, usedHeight: 0 }));
  else op.close();
  return {
    op,
    prepared,
    cursor,
    handle,
    refs: [descriptor, providerResource, viewResource].map((value) => new WeakRef(value)),
  };
}

function control() {
  return new WeakRef(Buffer.alloc(1024 * 1024));
}

const retained = [retainedOperation(false), retainedOperation(true)];
const unregistered = control();
const live = Buffer.alloc(1024 * 1024);
const liveRef = new WeakRef(live);
assert.ok(global.gc, "child must run with --expose-gc");
// Never dereference candidates between GC turns: WeakRef deref keeps targets alive for that job.
for (let i = 0; i < 20; i++) {
  await new Promise((resolve) => setTimeout(resolve, 5));
  global.gc();
}
assert.equal(unregistered.deref(), undefined, "unregistered control must collect");
assert.equal(liveRef.deref(), live, "strongly retained control must survive");
for (const item of retained) {
  for (const ref of item.refs) assert.equal(ref.deref(), undefined, "operation must release original host resource");
  assert.ok(Object.isFrozen(item.op.counts()));
  assert.throws(() => item.op.select(item.prepared, { offset: 0, width: 10, height: 0, usedHeight: 0 }));
  assert.throws(() => item.op.fragment(item.cursor, { id: "r", width: 10, height: 0, usedHeight: 0 }));
  assert.throws(() => item.handle!.consume(0));
}
