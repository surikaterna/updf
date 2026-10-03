import assert from "node:assert/strict";
import test from "node:test";
import { type Frame, Playback, type Scheduler } from "../../apps/showcase/src/plasma/controller.js";

class Fixture {
  private time = 0;
  private callback: ((time: number) => void) | undefined;
  private resolve: ((frame: Frame) => void) | undefined;
  private reject: ((error: Error) => void) | undefined;
  private next = 0;
  private disposals = 0;
  readonly released: number[] = [];
  readonly shown: number[] = [];
  readonly scheduler: Scheduler = {
    now: () => this.time,
    request: (fn) => {
      this.callback = fn;
      return 1;
    },
    cancel: () => {
      this.callback = undefined;
    },
    yield: async () => {},
  };
  readonly producer = {
    produce: (index: number) => {
      this.next = index;
      return new Promise<Frame>((yes, no) => {
        this.resolve = yes;
        this.reject = no;
      });
    },
    dispose: async () => {
      this.disposals += 1;
    },
  };
  readonly playback: Playback<Frame>;
  constructor(capacity: number) {
    this.playback = new Playback(
      capacity,
      this.producer,
      (frame) => this.shown.push(frame.index),
      () => {},
      this.scheduler,
    );
  }
  disposed(): number {
    return this.disposals;
  }
  tick(now: number): void {
    this.time = now;
    const fn = this.callback;
    this.callback = undefined;
    fn?.(now);
  }
  async finish(): Promise<void> {
    this.time += 5;
    const index = this.next;
    this.resolve?.({ index, release: () => this.released.push(index) });
    await flush();
  }
  async fail(): Promise<void> {
    this.reject?.(new Error("Injected failure"));
    await flush();
  }
}

function fixture(capacity = 2): Fixture {
  return new Fixture(capacity);
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

test("queue cap excludes display/inflight, ordered frames, delayed slots never burst", async () => {
  const f = fixture();
  f.playback.start();
  await f.finish();
  assert.equal(f.playback.state, "prefilling");
  await f.finish();
  assert.equal(f.playback.queue.length, 2);
  assert.equal(f.playback.inFlight, false);
  f.tick(50);
  assert.deepEqual(f.shown, [0]);
  assert.equal(f.playback.inFlight, true);
  f.tick(210);
  assert.deepEqual(f.shown, [0, 1]);
  assert.equal(f.playback.lateSlots, 3);
  f.tick(250);
  assert.equal(f.playback.underruns, 1);
  assert.deepEqual(f.shown, [0, 1]);
  await f.finish();
  f.tick(290);
  assert.deepEqual(f.shown, [0, 1, 2]);
  f.playback.stop();
  await f.finish();
  assert.ok(f.released.includes(3));
});

test("pause admits only inflight completion, excludes paused metrics, resume uses fresh deadline", async () => {
  const f = fixture(1);
  f.playback.start();
  await f.finish();
  f.tick(45);
  f.playback.pause();
  const activeMs = f.playback.metrics().activeMs;
  f.tick(1045);
  await f.finish();
  assert.equal(f.playback.queue.length, 1);
  assert.equal(f.playback.metrics().activeMs, activeMs);
  assert.equal(f.playback.pipelineMs, 5);
  f.playback.resume();
  f.tick(1089);
  assert.deepEqual(f.shown, [0]);
  f.tick(1090);
  assert.deepEqual(f.shown, [0, 1]);
  f.playback.stop();
  await f.finish();
  assert.equal(f.disposed(), 1);
  assert.equal(f.playback.queue.length, 0);
});

test("producer failures surface and dispose; stopped pending frames cannot publish", async () => {
  const f = fixture();
  f.playback.start();
  await f.fail();
  assert.equal(f.playback.state, "error");
  assert.equal(f.playback.error, "Injected failure");
  assert.equal(f.disposed(), 1);
  assert.throws(() => fixture(51));
  const stopped = fixture();
  stopped.playback.start();
  stopped.playback.stop();
  await stopped.finish();
  assert.deepEqual(stopped.shown, []);
  assert.deepEqual(stopped.released, [0]);
});

test("both capacity extremes remain bounded; paused prefill resumes without skipping frames", async () => {
  for (const capacity of [1, 50]) {
    const f = fixture(capacity);
    f.playback.start();
    for (let i = 0; i < capacity; i += 1) await f.finish();
    assert.equal(f.playback.queue.length, capacity);
    assert.equal(f.playback.inFlight, false);
    f.tick(capacity * 5 + 40);
    assert.equal(f.playback.queue.length, capacity - 1);
    assert.equal(f.playback.inFlight, true);
    await f.finish();
    assert.equal(f.playback.queue.length, capacity);
    f.playback.stop();
    assert.equal(new Set(f.released).size, capacity + 1);
  }
  const f = fixture();
  f.playback.start();
  f.playback.pause();
  await f.finish();
  assert.equal(f.playback.queue.length, 1);
  assert.equal(f.playback.inFlight, false);
  f.playback.resume();
  await f.finish();
  f.tick(50);
  assert.deepEqual(f.shown, [0]);
  f.playback.stop();
  await f.finish();
});
