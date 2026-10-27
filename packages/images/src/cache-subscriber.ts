import { DocumentError } from "@updf/core/internal";
import type { PreparationSignal } from "@updf/layout/internal-preparation";
import type { ImageClaim } from "./cache-owner.js";
import type { PreparedJobResult } from "./prepared-job.js";

export interface Subscriber {
  readonly deliver: (result?: Readonly<PreparedJobResult>, error?: unknown) => void;
  readonly cancel: () => void;
}

/** A removable record, not a promise reaction retaining a cancelled operation. */
export function subscriber(
  active: Set<Subscriber>,
  signal: PreparationSignal | undefined,
  empty: () => void,
): ImageClaim {
  let resolve!: (result: Readonly<PreparedJobResult>) => void;
  let reject!: (error: unknown) => void;
  const result = new Promise<Readonly<PreparedJobResult>>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  let listening = false;
  const remove = () => {
    if (!active.delete(record)) return false;
    if (listening) signal!.removeEventListener("abort", record.cancel);
    return true;
  };
  const record: Subscriber = {
    deliver(value, error) {
      if (!remove()) return;
      if (value) resolve(value);
      else reject(error);
    },
    cancel() {
      if (!remove()) return;
      reject(new DocumentError("MEASUREMENT_CONTEXT", "/images/cache", "Image cache claim cancelled"));
      if (!active.size) empty();
    },
  };
  active.add(record);
  if (signal) {
    listening = true;
    try {
      signal.addEventListener("abort", record.cancel);
    } catch (error) {
      record.deliver(undefined, error);
      if (!active.size) empty();
    }
    if (!active.has(record)) signal.removeEventListener("abort", record.cancel);
    if (signal.aborted) record.cancel();
  }
  return { result, release: record.cancel };
}
