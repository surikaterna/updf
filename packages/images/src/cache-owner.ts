import { fail } from "@updf/core/internal";
import type { PreparationSignal } from "@updf/layout/internal-preparation";
import type { ImageCache } from "./cache.js";
import type { PreparedJobResult } from "./prepared-job.js";

export interface ImagePolicy {
  readonly receiver: object;
  readonly resolve: object;
  readonly load: object;
  readonly handlers: readonly object[];
}
export interface ImageClaim {
  readonly result: Promise<Readonly<PreparedJobResult>>;
  readonly release: () => void;
}
export interface CachePort {
  readonly peek: (policy: ImagePolicy, uri: string) => Readonly<PreparedJobResult> | undefined;
  readonly acquire: (
    policy: ImagePolicy,
    uri: string,
    maxBytes: number,
    signal: PreparationSignal | undefined,
    run: (signal: PreparationSignal) => Promise<Readonly<PreparedJobResult>>,
  ) => ImageClaim;
}
// Root and load consumers do not allocate a registry or import the backend.
let owners: WeakMap<object, CachePort> | undefined;
export function ownCache(handle: ImageCache, port: CachePort): void {
  owners ??= new WeakMap();
  owners.set(handle, port);
}
export function cachePort(value: unknown): CachePort {
  const port = value && typeof value === "object" ? owners?.get(value) : undefined;
  if (!port) fail("TYPE", "/images/cache", "Expected owned image cache");
  return port;
}
