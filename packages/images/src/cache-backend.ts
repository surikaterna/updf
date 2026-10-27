import { fail } from "@updf/core/internal";
import { ownedResourceBytes } from "@updf/core/resources";
import type { PreparationSignal } from "@updf/layout/internal-preparation";
import type { ImageCacheSnapshot } from "./cache.js";
import type { CachePort, ImagePolicy } from "./cache-owner.js";
import { subscriber, type Subscriber } from "./cache-subscriber.js";
import type { PreparedJobResult } from "./prepared-job.js";
import { imageSource } from "./source.js";

interface Key {
  readonly policy: ImagePolicy;
  readonly uri: string;
  readonly keyBytes: number;
}
interface Entry extends Key {
  readonly value: Readonly<PreparedJobResult>;
  readonly bytes: number;
  readonly order: number;
}
interface JobController {
  readonly signal: PreparationSignal;
  abort(): void;
}
interface Job extends Key {
  readonly maxBytes: number;
  readonly order: number;
  readonly generation: object;
  readonly controller: JobController;
  readonly active: Set<Subscriber>;
  joinable: boolean;
  superseded: boolean;
}
function samePolicy(a: ImagePolicy, b: ImagePolicy): boolean {
  return (
    a.receiver === b.receiver &&
    a.resolve === b.resolve &&
    a.load === b.load &&
    a.handlers.length === b.handlers.length &&
    a.handlers.every((handler, i) => handler === b.handlers[i])
  );
}

/** The only policy index is the bounded live records; removal also releases policy identities. */
export class CacheBackend implements CachePort {
  private readonly entries: Entry[] = [];
  private readonly jobs = new Set<Job>();
  private generation = {};
  private disposed = false;
  private order = 0;
  constructor(
    private readonly maxEntries: number,
    private readonly maxBytes: number,
    private readonly maxConsumers: number,
  ) {}

  readonly snapshot = (): Readonly<ImageCacheSnapshot> =>
    Object.freeze({
      entries: this.entries.length,
      pending: this.jobs.size,
      consumers: [...this.jobs].reduce((sum, job) => sum + job.active.size, 0),
      accountedBytes: this.bytes(),
      disposed: this.disposed,
    });

  readonly clear = (): void => {
    this.generation = {};
    this.entries.length = 0;
    for (const job of this.jobs) job.joinable = false;
  };

  readonly dispose = (): void => {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    for (const job of this.jobs) {
      for (const consumer of job.active) consumer.cancel();
      job.controller.abort();
    }
  };

  readonly peek = (policy: ImagePolicy, uri: string): Readonly<PreparedJobResult> | undefined => {
    this.check();
    const index = this.entries.findIndex((entry) => entry.uri === uri && samePolicy(entry.policy, policy));
    if (index < 0) return undefined;
    const [entry] = this.entries.splice(index, 1);
    this.entries.push(entry!);
    return entry!.value;
  };

  readonly acquire: CachePort["acquire"] = (policy, uri, maxBytes, signal, run) => {
    this.check();
    if (this.snapshot().consumers >= this.maxConsumers) fail("LIMIT", "/images/cache", "Image cache consumer bound");
    const existing = [...this.jobs].find(
      (job) => job.joinable && job.uri === uri && job.maxBytes === maxBytes && samePolicy(job.policy, policy),
    );
    if (existing) return this.claim(existing, signal);
    const keyBytes = uri.length * 2;
    if (!Number.isSafeInteger(keyBytes) || keyBytes > this.maxBytes || this.order === Number.MAX_SAFE_INTEGER)
      fail("LIMIT", "/images/cache", "Image cache key or start order bound");
    if (this.jobs.size >= this.maxEntries || this.pendingBytes() > this.maxBytes - keyBytes)
      fail("LIMIT", "/images/cache", "Image cache pending capacity bound");
    this.makeRoom(keyBytes);
    const job: Job = {
      policy,
      uri,
      keyBytes,
      maxBytes,
      order: ++this.order,
      generation: this.generation,
      controller: createController(),
      active: new Set(),
      joinable: true,
      superseded: false,
    };
    this.jobs.add(job);
    const claim = this.claim(job, signal);
    if (!job.active.size) {
      this.jobs.delete(job);
      return claim;
    }
    // Exactly one settlement observer; cancelled subscribers are removed from active.
    void Promise.resolve()
      .then(() => run(job.controller.signal))
      .then(
        (value) => this.finish(job, value),
        (error: unknown) => this.finish(job, undefined, error),
      );
    return claim;
  };

  private claim(job: Job, signal: PreparationSignal | undefined) {
    return subscriber(job.active, signal, () => {
      job.joinable = false;
      job.controller.abort();
    });
  }

  private finish(job: Job, value?: Readonly<PreparedJobResult>, error?: unknown): void {
    this.jobs.delete(job);
    if (value) {
      try {
        imageSource(value.resource, "/images/cache/resource");
        ownedResourceBytes(value.resource);
        if (!Number.isSafeInteger(value.sourceBytes) || value.sourceBytes < 0 || value.sourceBytes > job.maxBytes)
          fail("LIMIT", "/images/cache", "Invalid image source byte accounting");
        value = Object.freeze({ resource: value.resource, sourceBytes: value.sourceBytes });
        // Publish authentic preparation before delivery, independently of operation admission.
        this.retain(job, value);
      } catch (failure) {
        error = failure;
        value = undefined;
      }
    }
    for (const consumer of job.active) consumer.deliver(value, error);
  }

  private retain(job: Job, value: Readonly<PreparedJobResult>): void {
    if (job.superseded || !job.active.size || !job.joinable || this.disposed || job.generation !== this.generation)
      return;
    const bytes = ownedResourceBytes(value.resource);
    if (bytes > this.maxBytes - job.keyBytes) return;
    const index = this.entries.findIndex((entry) => entry.uri === job.uri && samePolicy(entry.policy, job.policy));
    if (index >= 0 && this.entries[index]!.order > job.order) return;
    if (this.jobs.size >= this.maxEntries || this.pendingBytes() > this.maxBytes - bytes - job.keyBytes) return;
    if (index >= 0) this.entries.splice(index, 1);
    this.makeRoom(bytes + job.keyBytes);
    this.entries.push({ policy: job.policy, uri: job.uri, keyBytes: job.keyBytes, value, bytes, order: job.order });
    for (const pending of this.jobs)
      if (pending.order < job.order && pending.uri === job.uri && samePolicy(pending.policy, job.policy))
        pending.superseded = true;
  }

  private check(): void {
    if (this.disposed) fail("PHASE", "/images/cache", "Image cache disposed");
  }
  private pendingBytes(): number {
    return [...this.jobs].reduce((sum, job) => sum + job.keyBytes, 0);
  }
  private bytes(): number {
    return this.entries.reduce((sum, entry) => sum + entry.keyBytes + entry.bytes, this.pendingBytes());
  }
  private makeRoom(bytes: number): void {
    while (
      this.entries.length &&
      (this.entries.length + this.jobs.size >= this.maxEntries || this.bytes() > this.maxBytes - bytes)
    )
      this.entries.shift();
  }
}
function createController(): JobController {
  const host = globalThis as unknown as { AbortController?: new () => JobController };
  if (typeof host.AbortController !== "function")
    fail("PHASE", "/images/cache", "AbortController required for cache jobs");
  return new host.AbortController();
}
