import assert from "node:assert/strict";
import test from "node:test";
import { FragmentState } from "../dist/cjs/fragment-state.js";

test("fork shares the exact immutable snapshot; writes isolate in both directions and preserve owner/offset identity", () => {
  const first = {},
    second = {},
    state = new FragmentState();
  state.set(first, 0, 10n);
  state.set(first, 1, 11n);
  state.set(second, 0, 20n);
  const fork = state.fork();
  // The snapshot is intentionally shared, not deep-copied, until a write publishes a new map.
  const snapshot = (value: FragmentState) => Reflect.get(value, "values");
  assert.equal(snapshot(fork), snapshot(state));
  fork.set(first, 0, 30n);
  state.set(second, 0, 40n);
  assert.notEqual(snapshot(fork), snapshot(state));
  assert.deepEqual([state.get(first, 0), state.get(first, 1), state.get(second, 0)], [10n, 11n, 40n]);
  assert.deepEqual([fork.get(first, 0), fork.get(first, 1), fork.get(second, 0)], [30n, 11n, 20n]);
  assert.equal(fork.get({}, 0), undefined);
  assert.equal(fork.get(first, 2), undefined);
});

test("adopt replaces rather than merges; nested and discarded candidates remain isolated after adoption", () => {
  const owner = {},
    extra = {},
    state = new FragmentState();
  state.set(owner, 0, 1n);
  const candidate = state.fork(),
    discarded = candidate.fork();
  candidate.set(owner, 1, 2n);
  const nested = candidate.fork();
  nested.set(owner, 2, 3n);
  discarded.set(owner, 0, 99n);
  state.set(extra, 0, 88n);
  candidate.adopt(nested);
  state.adopt(candidate);
  assert.equal(state.get(extra, 0), undefined);
  assert.deepEqual([state.get(owner, 0), state.get(owner, 1), state.get(owner, 2)], [1n, 2n, 3n]);
  nested.set(owner, 2, 33n);
  candidate.set(owner, 1, 22n);
  discarded.set(owner, 3, 44n);
  state.set(owner, 0, 11n);
  assert.deepEqual(
    [state.get(owner, 0), state.get(owner, 1), state.get(owner, 2), state.get(owner, 3)],
    [11n, 2n, 3n, undefined],
  );
  assert.equal(candidate.get(owner, 0), 1n);
  assert.equal(nested.get(owner, 0), 1n);
  assert.equal(discarded.get(owner, 1), undefined);
});
