export interface Frame {
  readonly index: number;
  release(): void;
}
export interface Producer<T extends Frame> {
  produce(index: number): Promise<T>;
  dispose(): Promise<void>;
}
export interface Scheduler {
  now(): number;
  request(callback: (time: number) => void): number;
  cancel(id: number): void;
  yield(): Promise<void>;
}
export const browserScheduler: Scheduler = {
  now: () => performance.now(),
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
  yield: () => new Promise((resolve) => setTimeout(resolve, 0)),
};

export class Playback<T extends Frame> {
  readonly queue: T[] = [];
  state: "prefilling" | "playing" | "paused" | "stopped" | "error" = "prefilling";
  error = "";
  displayed: T | undefined;
  inFlight = false;
  presented = 0;
  produced = 0;
  underruns = 0;
  lateSlots = 0;
  pipelineMs = 0;
  prebufferMs = 0;
  private readonly started: number;
  private index = 0;
  private deadline = 0;
  private raf?: number;
  private busy = false;
  private prefilled = false;
  private activeStart: number | undefined;
  private elapsed = 0;
  private pauseStart: number | undefined;
  private pausedMs = 0;

  constructor(
    readonly capacity: number,
    private readonly producer: Producer<T>,
    private readonly show: (frame: T) => void,
    private readonly changed: () => void,
    private readonly scheduler: Scheduler = browserScheduler,
  ) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50)
      throw new Error("Buffer must be an integer from 1 to 50");
    this.started = scheduler.now();
  }

  start(): void {
    void this.pump();
  }

  pause(): void {
    if (!this.active()) return;
    const now = this.scheduler.now();
    if (this.activeStart !== undefined) this.elapsed += now - this.activeStart;
    this.activeStart = undefined;
    this.pauseStart = now;
    this.state = "paused";
    if (this.raf !== undefined) this.scheduler.cancel(this.raf);
    this.changed();
  }

  resume(): void {
    if (this.state !== "paused") return;
    this.pausedMs += this.scheduler.now() - (this.pauseStart ?? this.scheduler.now());
    this.pauseStart = undefined;
    this.state = this.prefilled ? "playing" : "prefilling";
    if (this.prefilled) this.schedule();
    void this.pump();
    this.changed();
  }

  stop(): void {
    this.pause();
    this.state = "stopped";
    this.clear();
    void this.producer.dispose().catch(() => {});
    this.changed();
  }

  metrics() {
    const duration = this.elapsed + (this.activeStart === undefined ? 0 : this.scheduler.now() - this.activeStart);
    return {
      state: this.state,
      capacity: this.capacity,
      queue: this.queue.length,
      inFlight: this.inFlight,
      presented: this.presented,
      produced: this.produced,
      presentedFPS: duration ? (this.presented * 1000) / duration : 0,
      pipelineFPS: this.pipelineMs ? (this.produced * 1000) / this.pipelineMs : 0,
      pipelineMs: this.pipelineMs,
      activeMs: duration,
      prebufferMs: this.prebufferMs,
      underruns: this.underruns,
      lateSlots: this.lateSlots,
      index: this.displayed?.index,
    };
  }

  private active(): boolean {
    return this.state === "prefilling" || this.state === "playing";
  }

  private pipelineTime(): number {
    return (
      this.scheduler.now() -
      this.pausedMs -
      (this.pauseStart === undefined ? 0 : this.scheduler.now() - this.pauseStart)
    );
  }

  private async pump(): Promise<void> {
    if (this.busy || !this.active()) return;
    this.busy = true;
    try {
      while (this.active() && this.queue.length < this.capacity) {
        this.inFlight = true;
        const start = this.pipelineTime();
        const frame = await this.producer.produce(this.index++);
        this.inFlight = false;
        if (this.state === "stopped" || this.state === "error") {
          frame.release();
          break;
        }
        this.pipelineMs += this.pipelineTime() - start;
        this.produced += 1;
        this.queue.push(frame);
        this.beginPlayback();
        this.changed();
        await this.scheduler.yield();
      }
    } catch (error) {
      this.inFlight = false;
      this.fail(error);
    } finally {
      this.inFlight = false;
      this.busy = false;
    }
  }

  private beginPlayback(): void {
    if (this.prefilled || this.queue.length < this.capacity) return;
    this.prefilled = true;
    this.prebufferMs = this.pipelineTime() - this.started;
    if (this.state === "paused") return;
    this.state = "playing";
    this.schedule();
  }

  private schedule(): void {
    this.activeStart = this.scheduler.now();
    this.deadline = this.activeStart + 40;
    this.raf = this.scheduler.request((time) => this.tick(time));
  }

  private tick(time: number): void {
    if (this.state !== "playing") return;
    if (time >= this.deadline) {
      const slots = Math.floor((time - this.deadline) / 40) + 1;
      this.lateSlots += slots - 1;
      this.deadline += slots * 40;
      const frame = this.queue.shift();
      if (frame) this.present(frame);
      else this.underruns += 1;
      void this.pump();
      this.changed();
    }
    this.raf = this.scheduler.request((next) => this.tick(next));
  }

  private present(frame: T): void {
    this.show(frame);
    this.displayed?.release();
    this.displayed = frame;
    this.presented += 1;
  }

  private clear(): void {
    for (const frame of this.queue.splice(0)) frame.release();
    this.displayed?.release();
    this.displayed = undefined;
  }

  private fail(error: unknown): void {
    if (this.state === "stopped") return;
    this.pause();
    this.state = "error";
    this.error = error instanceof Error ? error.message : String(error);
    this.clear();
    void this.producer.dispose().catch(() => {});
    this.changed();
  }
}
