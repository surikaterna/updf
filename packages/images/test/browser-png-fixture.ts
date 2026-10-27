import { fixture } from "../../png/test/helpers.js";

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

export function fakeBrowser() {
  const state = { decodes: 0, draws: 0, encodes: 0, closes: 0, reads: 0, width: 2, height: 5 };
  const bitmap = { width: 2, height: 5, close: () => state.closes++ };
  const encoded = fixture(6, undefined);
  const blob = {
    size: encoded.length,
    type: "image/png",
    async arrayBuffer() {
      state.reads++;
      return Uint8Array.from(encoded).buffer;
    },
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: () => state.draws++ }),
    convertToBlob: async () => {
      state.encodes++;
      return blob;
    },
  };
  const host = {
    createImageBitmap: async (_blob: unknown) => {
      state.decodes++;
      return bitmap;
    },
    document: { createElement: () => canvas },
    OffscreenCanvas: undefined,
  };
  return { state, bitmap, blob, canvas, host };
}

export async function withBrowser(run: (fake: ReturnType<typeof fakeBrowser>) => Promise<void>) {
  const fake = fakeBrowser();
  const previous = Object.getOwnPropertyDescriptors(globalThis);
  Object.assign(globalThis, fake.host);
  Object.assign(globalThis, { createImageBitmap: (blob: unknown) => fake.host.createImageBitmap(blob) });
  try {
    await run(fake);
  } finally {
    for (const key of Object.keys(fake.host)) {
      const descriptor = previous[key];
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}
