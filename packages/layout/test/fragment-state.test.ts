import assert from "node:assert/strict";
import test from "node:test";
import { fragmentSlot } from "../src/fragment-slot.js";
import { FragmentState } from "../src/fragment-state.js";

test("typed checkpoints isolate lookahead and replace one endpoint only on adoption", () => {
  const slot = fragmentSlot<{ readonly offset: number; readonly continuation?: object }>();
  const other = fragmentSlot<{ readonly offset: number }>();
  const accepted = new FragmentState();
  const initial = Object.freeze({ offset: 0 });
  accepted.write(slot, initial);
  const a = accepted.fork();
  const b = accepted.fork();
  a.write(slot, Object.freeze({ offset: 7, continuation: Object.freeze({}) }));
  b.write(slot, Object.freeze({ offset: 3 }));
  assert.equal(accepted.read(slot), initial);
  assert.equal(accepted.read(other), undefined);
  assert.equal(a.read(slot)?.offset, 7);
  accepted.adopt(b);
  assert.equal(accepted.read(slot)?.offset, 3);
  b.write(slot, Object.freeze({ offset: 12 }));
  assert.equal(accepted.read(slot)?.offset, 3);
  assert.throws(() => accepted.read({ ...slot }));
  assert.throws(() => accepted.write(slot, { offset: 1 }));
  assert.throws(() => accepted.write(slot, Object.freeze({ offset: 1, continuation: {} })));
  assert.throws(() => accepted.write(slot, Object.freeze({ offset: 1, continuation: new Map() })));
});

test("slot checkpoints and existing bigint spacer state fork and adopt independently", () => {
  const state = new FragmentState();
  const spacer = {};
  const slot = fragmentSlot<{ readonly offset: number }>();
  state.set(spacer, 1, 9n);
  const candidate = state.fork();
  candidate.set(spacer, 2, 4n);
  candidate.write(slot, Object.freeze({ offset: 2 }));
  assert.equal(state.get(spacer, 2), undefined);
  assert.equal(state.read(slot), undefined);
  state.adopt(candidate);
  assert.equal(state.get(spacer, 1), 9n);
  assert.equal(state.get(spacer, 2), 4n);
  assert.equal(state.read(slot)?.offset, 2);
});

test("fork/adopt rejects symbol data, accessors, functions and inherited mutable array data without reads", () => {
  const slot = fragmentSlot<object>();
  const accepted = new FragmentState();
  const initial = Object.freeze({ offset: 1 });
  accepted.write(slot, initial);
  const mutable = { offset: 1 };
  let reads = 0;
  const symbol = Symbol("checkpoint");
  const callback = Object.assign(() => {}, { mutable });
  const inherited = Object.freeze(Object.setPrototypeOf([], { mutable }));
  const candidates = [
    Object.freeze({ [symbol]: mutable }),
    Object.freeze({
      get [symbol]() {
        reads++;
        return mutable;
      },
    }),
    Object.freeze({
      get offset() {
        reads++;
        return mutable.offset;
      },
    }),
    Object.freeze({ callback }),
    Object.freeze({ callback: Object.freeze(callback) }),
    Object.freeze({ array: inherited }),
    Object.freeze({ array: Object.freeze([mutable]) }),
    Object.freeze({ value: symbol }),
  ];
  for (const checkpoint of candidates) {
    const candidate = accepted.fork();
    assert.throws(() => candidate.write(slot, checkpoint));
    accepted.adopt(candidate);
    mutable.offset = 99;
    assert.equal(accepted.read(slot), initial);
    assert.equal(candidate.read(slot), initial);
    assert.equal((accepted.read(slot) as { offset: number }).offset, 1);
  }
  assert.equal(reads, 0);
});

test("ordinary frozen checkpoint graphs retain exact opaque identity through nested fork adoption", () => {
  const slot = fragmentSlot<{ offset: number; continuation: object; data: readonly unknown[] }>();
  const handle = Object.freeze({});
  const leaf = Object.freeze(Object.assign(Object.create(null), { value: 2n }));
  const checkpoint = Object.freeze({ offset: 1, continuation: handle, data: Object.freeze([leaf, leaf, null]) });
  const root = new FragmentState();
  const child = root.fork();
  const nested = child.fork();
  nested.write(slot, checkpoint);
  const owner = {};
  nested.set(owner, 1, 5n);
  child.adopt(nested);
  const sibling = root.fork();
  sibling.adopt(nested);
  assert.equal(sibling.read(slot), checkpoint);
  root.adopt(child.fork());
  assert.equal(root.read(slot), checkpoint);
  assert.equal(root.read(slot)?.continuation, handle);
  assert.equal(root.get(owner, 1), 5n);
  nested.write(slot, Object.freeze({ ...checkpoint, offset: 99 }));
  nested.set(owner, 1, 99n);
  assert.equal(root.read(slot)?.offset, 1);
  assert.equal(root.get(owner, 1), 5n);
});

test("internal frozen checkpoint graphs validate iteratively with sharing and cycles", () => {
  const slot = fragmentSlot<object>();
  const state = new FragmentState();
  const cycle: { self?: object } = {};
  cycle.self = cycle;
  let checkpoint = Object.freeze(cycle);
  for (let i = 0; i < 10000; i++) checkpoint = Object.freeze({ self: checkpoint });
  const candidate = state.fork();
  candidate.write(slot, checkpoint);
  state.adopt(candidate);
  assert.equal(state.read(slot), checkpoint);
});

test("adoption authenticates private fork family before reading fake maps or getters", () => {
  const root = new FragmentState();
  const slot = fragmentSlot<{ offset: number }>();
  const initial = Object.freeze({ offset: 1 });
  const owner = {};
  root.write(slot, initial);
  root.set(owner, 1, 1n);
  const externalMap = new Map([[slot, { offset: 1 }]]);
  let reads = 0;
  const fake = {
    get slots() {
      reads++;
      return externalMap;
    },
    get values() {
      reads++;
      return externalMap;
    },
  };
  for (const candidate of [
    new FragmentState(),
    { slots: externalMap },
    fake,
    Object.create(FragmentState.prototype),
    { ...root },
    new Proxy(root, {}),
    null,
  ])
    assert.throws(() => root.adopt(candidate as FragmentState));
  externalMap.get(slot)!.offset = 99;
  assert.equal(reads, 0);
  assert.equal(root.read(slot), initial);
  assert.equal(root.get(owner, 1), 1n);
  assert.deepEqual(Reflect.ownKeys(root), []);
  const valid = root.fork();
  Object.assign(valid, { slots: externalMap, values: externalMap });
  root.adopt(valid);
  externalMap.clear();
  assert.equal(root.read(slot), initial);
  assert.equal(root.get(owner, 1), 1n);
});
