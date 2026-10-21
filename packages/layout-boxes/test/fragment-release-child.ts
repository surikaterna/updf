import assert from "node:assert/strict";
import { createFragmentOperation, createRangeOperation, type ProviderWork } from "../src/fragmentation.js";

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
  const candidate = op.nextCandidate(op.candidates(prepared, { offset: 0, width: 10 }));
  if (candidate.done) throw new Error("expected candidate");
  if (poison) assert.throws(() => op.select({} as typeof prepared, { offset: 0, width: 10, height: 0, usedHeight: 0 }));
  else op.close();
  return {
    op,
    prepared,
    cursor,
    candidateCursor: candidate.cursor,
    endpoint: candidate.endpoint,
    handle,
    refs: [descriptor, providerResource, viewResource].map((value) => new WeakRef(value)),
  };
}

function control() {
  return new WeakRef(Buffer.alloc(1024 * 1024));
}

function retainedRange(poison: boolean) {
  const descriptor = Buffer.alloc(1024 * 1024);
  const content = Buffer.alloc(1024 * 1024);
  let handle: ProviderWork | undefined;
  const op = createRangeOperation({
    next: (_, { offset }, work) => {
      handle = work;
      return { end: offset + 1, height: 0, content };
    },
  });
  const prepared = op.prepare({
    id: "range",
    path: "/range",
    descriptor,
    extent: 1,
    mode: "atomic",
    width: { mode: "fixed", value: 1 },
  });
  const request = { offset: 0, width: 1, height: 0, usedHeight: 0 };
  op.select(prepared, request);
  if (poison) assert.throws(() => op.select({} as typeof prepared, request));
  else op.close();
  return { op, prepared, request, handle, refs: [new WeakRef(descriptor), new WeakRef(content)] };
}

const retained = [retainedOperation(false), retainedOperation(true)];
const ranges = [retainedRange(false), retainedRange(true)];
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
  assert.throws(() => item.op.nextCandidate(item.candidateCursor));
  assert.throws(() => item.op.materializeCandidate(item.endpoint));
}
for (const item of ranges) {
  for (const ref of item.refs) assert.equal(ref.deref(), undefined, "range owner must release host resources");
  assert.ok(Object.isFrozen(item.op.counts()));
  assert.throws(() => item.op.select(item.prepared, item.request), /closed/);
  assert.throws(() => item.handle!.consume(0), /expired/);
}
