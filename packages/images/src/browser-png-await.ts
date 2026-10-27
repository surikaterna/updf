import { DocumentError } from "@updf/core";
import type { PngSignal } from "@updf/png/normalization";

export function active(signal?: PngSignal): void {
  if (signal?.aborted) throw new DocumentError("PNG_ABORT", "/source", "PNG preparation was aborted");
}

/** Native promises cannot be preempted. Abandoned acquisitions are closed on eventual settlement. */
export function hostResult<T>(pending: Promise<T>, signal?: PngSignal, abandoned?: (value: T) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const abort = () => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abort);
      reject(new DocumentError("PNG_ABORT", "/source", "PNG preparation was aborted"));
    };
    signal?.addEventListener("abort", abort, { once: true });
    pending.then(
      (value) => {
        if (signal?.aborted) abort();
        if (settled) {
          abandoned?.(value);
          return;
        }
        settled = true;
        signal?.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener("abort", abort);
        reject(error);
      },
    );
    if (signal?.aborted) abort();
  });
}
