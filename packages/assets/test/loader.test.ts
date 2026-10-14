import assert from "node:assert/strict";
import { createServer } from "node:http";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { AssetError, createAssetLoader, type AssetFetch } from "@updf/assets";
import { copyBytes } from "@updf/assets/bytes";

const errorCode = (code: string) => (error: unknown) => error instanceof AssetError && error.code === code;

test("shared byte loading owns genuine views without caller overrides, shared memory or detached buffers", async () => {
  const loader = createAssetLoader({ maxBytes: 4 });
  const bytes = new Uint8Array([1, 2, 3]);
  const owned = await loader.load(bytes);
  bytes.fill(0);
  assert.deepEqual([...owned], [1, 2, 3]);
  assert.deepEqual([...(await loader.load(Buffer.from([1])))], [1]);
  assert.deepEqual([...(await loader.load(runInNewContext("new Uint8Array([7,8])")))], [7, 8]);
  for (const key of ["buffer", "byteOffset", "byteLength", Symbol.iterator, Symbol.toStringTag])
    Object.defineProperty(bytes, key, {
      get() {
        throw new Error("getter ran");
      },
    });
  copyBytes(bytes, 4);
  for (const value of [[], {}, new Uint8Array(new SharedArrayBuffer(2)), new Proxy(new Uint8Array(1), {})])
    await assert.rejects(loader.load(value as Uint8Array), errorCode("TYPE"));
  const detached = new Uint8Array(2);
  structuredClone(detached.buffer, { transfer: [detached.buffer] });
  await assert.rejects(loader.load(detached), errorCode("TYPE"));
  assert.throws(() => copyBytes(new Uint8Array(1), undefined as unknown as number), errorCode("VALUE"));
  await assert.rejects(loader.load(new Uint8Array(5)), errorCode("LIMIT"));
  await assert.rejects(loader.load(new Uint8Array(3), { maxBytes: 2 }), errorCode("LIMIT"));
  await assert.rejects(loader.load(new Uint8Array(5), { maxBytes: 100 }), errorCode("LIMIT"));
});

test("native HTTP fetching is explicit, policy-checked and never follows redirects", async () => {
  const fetch: AssetFetch = globalThis.fetch;
  const server = createServer((request, response) => {
    if (request.url === "/redirect") {
      response.writeHead(302, { location: "/asset" });
      response.end();
      return;
    }
    response.end(new Uint8Array([1, 2, 3]));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseURI = `http://127.0.0.1:${address.port}/`;
    const loader = createAssetLoader({
      fetch,
      baseURI,
      allowUri: (uri) => new URL(uri).origin === new URL(baseURI).origin,
    });
    assert.equal(loader.resolve("./asset"), `${baseURI}asset`);
    assert.deepEqual([...(await loader.load("asset"))], [1, 2, 3]);
    for (const uri of [
      "redirect",
      "https://denied.example/a",
      "file:///secret",
      "data:font/ttf,x",
      "http://user:pass@example.com/a",
    ])
      await assert.rejects(loader.load(uri), errorCode("LOAD"));
    await assert.rejects(createAssetLoader().load(baseURI), errorCode("LOAD"));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("advertised/streamed limits cancel readers; timeouts and cancellation close requests", async () => {
  let cancelled = 0,
    released = 0;
  const response = (length: string | null) => ({
    ok: true,
    status: 200,
    headers: { get: () => length },
    body: {
      getReader: () => ({
        read: async () => ({ done: false, value: new Uint8Array(8) }),
        cancel: async () => {
          cancelled++;
        },
        releaseLock() {
          released++;
        },
      }),
    },
  });
  for (const length of [null, "99"]) {
    const loader = createAssetLoader({ maxBytes: 4, fetch: async () => response(length) });
    await assert.rejects(loader.load("https://example.com/a"), errorCode("LIMIT"));
  }
  assert.equal(cancelled, 2);
  assert.equal(released, 2);
  let transport: AbortSignal | undefined;
  const timeout = createAssetLoader({
    timeoutMs: 5,
    fetch: (_uri, init) => {
      transport = init?.signal as AbortSignal;
      return new Promise(() => {});
    },
  });
  await assert.rejects(timeout.load("https://example.com/a"), errorCode("LOAD"));
  assert.equal(transport?.aborted, true);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(timeout.load(new Uint8Array(1), { signal: controller.signal }), errorCode("LOAD"));
});

test("configuration is captured, has no global cache and ignores inherited fetch getters", async () => {
  let calls = 0;
  const config = {
    fetch: async () => {
      calls++;
      return new Response(new Uint8Array([1]));
    },
  };
  const loader = createAssetLoader(config);
  config.fetch = async () => {
    throw new Error("mutated");
  };
  await loader.load("https://example.com/a");
  await loader.load("https://example.com/a");
  assert.equal(calls, 2);
  Object.defineProperty(Object.prototype, "fetch", {
    configurable: true,
    get() {
      throw new Error("inherited fetch");
    },
  });
  try {
    await assert.rejects(createAssetLoader().load("https://example.com/a"), errorCode("LOAD"));
  } finally {
    Reflect.deleteProperty(Object.prototype, "fetch");
  }
  assert.throws(
    () =>
      createAssetLoader({
        get fetch(): AssetFetch {
          throw new Error("own getter");
        },
      }),
    errorCode("TYPE"),
  );
  assert.throws(() => createAssetLoader({ timeoutMs: 2147483648 }), errorCode("VALUE"));
});
