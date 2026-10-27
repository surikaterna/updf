import { fail, ownDataValue, validateDataObject } from "@updf/core/internal";

export interface PreparationSignal {
  readonly aborted: boolean;
  addEventListener(type: "abort", listener: () => void, options?: { readonly once?: boolean }): void;
  removeEventListener(type: "abort", listener: () => void): void;
}

function captureSignal(value: PreparationSignal) {
  const host = globalThis as unknown as { AbortSignal?: { prototype: PreparationSignal } };
  const prototype = host.AbortSignal?.prototype;
  const get = prototype && Object.getOwnPropertyDescriptor(prototype, "aborted")?.get;
  try {
    if (get && typeof get.call(value) === "boolean")
      return {
        aborted: () => get.call(value) as boolean,
        add: prototype!.addEventListener.bind(value),
        remove: prototype!.removeEventListener.bind(value),
      };
  } catch {
    /* A structural signal is validated without invoking accessors. */
  }
  validateDataObject(value, ["aborted", "addEventListener", "removeEventListener"], "/preparation/signal");
  const add = ownDataValue(value, "addEventListener", "/preparation/signal/addEventListener");
  const remove = ownDataValue(value, "removeEventListener", "/preparation/signal/removeEventListener");
  if (
    typeof add !== "function" ||
    typeof remove !== "function" ||
    typeof ownDataValue(value, "aborted", "/preparation/signal/aborted") !== "boolean"
  )
    fail("TYPE", "/preparation/signal", "Expected abort capability");
  return {
    aborted: () => {
      const aborted = ownDataValue(value, "aborted", "/preparation/signal/aborted");
      if (typeof aborted !== "boolean") fail("TYPE", "/preparation/signal/aborted", "Expected boolean abort state");
      return aborted;
    },
    add: add.bind(value),
    remove: remove.bind(value),
  };
}

export function preparationSignal(value: PreparationSignal | undefined, close: () => void) {
  const signal = value === undefined ? undefined : captureSignal(value);
  let aborted = false;
  const check = () => {
    if (aborted || signal?.aborted()) fail("MEASUREMENT_CONTEXT", "/preparation/signal", "Preparation aborted");
  };
  check();
  let rejectAbort: (error: unknown) => void = () => {};
  const cancelled = new Promise<never>((_resolve, reject) => {
    rejectAbort = reject;
  });
  void cancelled.catch(() => {});
  const abort = () => {
    aborted = true;
    close();
    try {
      fail("MEASUREMENT_CONTEXT", "/preparation/signal", "Preparation aborted");
    } catch (error) {
      rejectAbort(error);
    }
  };
  signal?.add("abort", abort, { once: true });
  if (signal?.aborted()) abort();
  return {
    check,
    wait: <T>(work: Promise<T>) => Promise.race([work, cancelled]),
    close() {
      try {
        signal?.remove("abort", abort);
      } catch (error) {
        close();
        throw error;
      }
    },
  };
}
