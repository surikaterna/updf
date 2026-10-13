import { fail } from "./errors.js";
import type { AssetLoaderOptions, AssetSignal } from "./types.js";

interface Url {
  readonly href: string;
  readonly protocol: string;
  readonly username: string;
  readonly password: string;
}
interface Controller {
  readonly signal: AssetSignal;
  abort(reason?: unknown): void;
}
const host = globalThis as unknown as {
  URL: new (uri: string, base?: string) => Url;
  AbortController: new () => Controller;
  location?: { readonly href: string };
  setTimeout(callback: () => void, milliseconds: number): unknown;
  clearTimeout(timer: unknown): void;
};

export function checkAbort(signal?: AssetSignal): void {
  if (signal?.aborted) fail("LOAD", "/source", "Asset loading was aborted");
}
export function resolveUri(source: string, state: AssetLoaderOptions): string {
  if (typeof source !== "string" || !source.trim()) fail("LOAD", "/source", "Expected an HTTP(S) asset URI");
  let uri: Url;
  try {
    uri = new host.URL(source, state.baseURI ?? host.location?.href);
  } catch {
    fail("LOAD", "/source", "Invalid asset URI; relative URIs need a base URI");
  }
  if (!["http:", "https:"].includes(uri.protocol) || uri.username || uri.password)
    fail("LOAD", "/source", "Only HTTP(S) URIs without embedded credentials are supported");
  if (state.allowUri && state.allowUri(uri.href) !== true)
    fail("LOAD", "/source", "Asset URI denied by application policy");
  return uri.href;
}
export function loadingScope(signal: AssetSignal | undefined, timeout: number) {
  checkAbort(signal);
  const controller = new host.AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const timer = host.setTimeout(abort, timeout);
  return {
    signal: controller.signal,
    close() {
      host.clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      controller.abort();
    },
  };
}
export async function abortable<T>(work: Promise<T>, signal: AssetSignal): Promise<T> {
  let abort: () => void = () => {};
  const cancelled = new Promise<never>((_resolve, reject) => {
    abort = () => {
      try {
        checkAbort(signal);
      } catch (error) {
        reject(error);
      }
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
  try {
    return await Promise.race([work, cancelled]);
  } finally {
    signal.removeEventListener("abort", abort);
  }
}
