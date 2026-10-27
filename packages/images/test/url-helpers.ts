import { createAssetLoader } from "@updf/images/load";
import { fixture } from "../../png/test/helpers.js";

export function transport(bytes: Uint8Array = fixture()) {
  const calls = { fetch: 0, policy: 0, cancel: 0, release: 0 };
  const loader = createAssetLoader({
    baseURI: "https://fixtures.invalid/base/",
    allowUri: () => {
      calls.policy++;
      return true;
    },
    fetch: async () => {
      calls.fetch++;
      let read = false;
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        body: {
          getReader: () => ({
            async read() {
              if (read) return { done: true };
              read = true;
              return { value: bytes };
            },
            async cancel() {
              calls.cancel++;
            },
            releaseLock() {
              calls.release++;
            },
          }),
        },
      };
    },
  });
  return { loader, calls };
}
