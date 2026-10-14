/** Structural platform contracts; importing this package requires no DOM/Node ambient types. */
export interface AssetSignal {
  readonly aborted: boolean;
  readonly reason?: unknown;
  addEventListener(type: "abort", listener: () => void, options?: { once?: boolean }): void;
  removeEventListener(type: "abort", listener: () => void): void;
}
export interface AssetReader {
  read(): Promise<{ readonly done?: boolean; readonly value?: Uint8Array | undefined }>;
  cancel(reason?: unknown): Promise<void>;
  releaseLock(): void;
}
export interface AssetResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  readonly body: { getReader(): AssetReader } | null;
}
export interface AssetFetchInit {
  readonly signal?: AssetSignal | null;
  readonly credentials?: "omit" | "same-origin" | "include";
  readonly redirect?: "error" | "follow" | "manual";
}
/** Method variance accepts standard Fetch signatures with their fuller platform signal types. */
export type AssetFetch = { fetch(uri: string, init?: AssetFetchInit): Promise<AssetResponse> }["fetch"];
export interface AssetLoaderOptions {
  readonly fetch?: AssetFetch;
  readonly baseURI?: string;
  readonly allowUri?: (uri: string) => boolean;
  readonly maxBytes?: number;
  readonly timeoutMs?: number;
}
export interface AssetLoadOptions {
  readonly signal?: AssetSignal;
  /** May tighten the configured byte limit, never raise it. */
  readonly maxBytes?: number;
}
export interface AssetLoader {
  /** Normalize and policy-check a URI, without fetching it. */
  readonly resolve: (uri: string) => string;
  /** A fresh operation: no permanent URI cache and no decoder imports. */
  readonly load: (source: string | Uint8Array, options?: AssetLoadOptions) => Promise<Uint8Array<ArrayBuffer>>;
}
