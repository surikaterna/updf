import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { AssetError, type AssetLoader } from "@updf/assets";
import { DocumentError } from "@updf/core";
import { prepareFont as prepareKit } from "@updf/fontkit";
import { loadFont as loadKit } from "@updf/fontkit/load";
import { prepareFont as prepareKite } from "@updf/fontkite";
import { loadFont as loadKite } from "@updf/fontkite/load";

const adapters = [
  { name: "Fontkit", load: loadKit, prepare: prepareKit },
  { name: "Fontkite", load: loadKite, prepare: prepareKite },
];
const fixture = async () =>
  new Uint8Array(await readFile(new URL("../fixtures/fonts/LiberationSans-Regular.ttf", import.meta.url)));
const diagnostic = (code: string, path?: string) => (error: unknown) =>
  error instanceof DocumentError &&
  error.diagnostics[0]?.code === code &&
  (path === undefined || error.diagnostics[0]?.path === path);
const malformed = (loader: unknown): AssetLoader => loader as AssetLoader;

function restricted(bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  const result = bytes.slice(),
    view = new DataView(result.buffer);
  for (let i = 0; i < view.getUint16(4); i++) {
    const at = 12 + 16 * i;
    if (String.fromCharCode(...result.subarray(at, at + 4)) === "OS/2") {
      view.setUint16(view.getUint32(at + 8) + 8, 2);
      return result;
    }
  }
  throw new Error("Fixture has no OS/2 table");
}

for (const adapter of adapters) {
  test(`${adapter.name}: resolve must be an own callable capability, including for byte sources`, async () => {
    const bytes = await fixture();
    let calls = 0;
    const load = async () => {
      calls++;
      return bytes;
    };
    for (const source of [bytes, "font.ttf"]) {
      for (const fields of [
        {},
        { resolve: undefined },
        { resolve: null },
        { resolve: 1 },
        { resolve: "uri" },
        { resolve: {} },
      ]) {
        await assert.rejects(
          adapter.load(source, { loader: malformed({ ...fields, load }) }),
          diagnostic("TYPE", "/options/loader/resolve"),
        );
      }
    }
    assert.equal(calls, 0);
  });

  test(`${adapter.name}: missing or non-callable load still fails at the capability boundary`, async () => {
    for (const fields of [{}, { load: undefined }, { load: null }, { load: 1 }, { load: "bytes" }]) {
      await assert.rejects(
        adapter.load("font.ttf", { loader: malformed({ resolve: (uri: string) => uri, ...fields }) }),
        diagnostic("TYPE", "/options/loader/load"),
      );
    }
  });

  test(`${adapter.name}: loader accessors, hidden fields and inherited methods never execute`, async () => {
    const bytes = await fixture();
    let getters = 0,
      loads = 0;
    for (const key of ["resolve", "load"] as const) {
      const loader = {
        resolve: (uri: string) => uri,
        load: async () => {
          loads++;
          return bytes;
        },
      };
      Object.defineProperty(loader, key, {
        enumerable: true,
        get() {
          getters++;
          throw new Error("getter ran");
        },
      });
      await assert.rejects(adapter.load("font.ttf", { loader }), diagnostic("TYPE", `/options/loader/${key}`));
      Object.defineProperty(loader, key, { enumerable: false, value: () => bytes });
      await assert.rejects(adapter.load("font.ttf", { loader }), diagnostic("TYPE", `/options/loader/${key}`));
    }
    const inherited = Object.assign(
      Object.create({
        resolve: () => {
          getters++;
          return "uri";
        },
      }),
      {
        load: async () => {
          loads++;
          return bytes;
        },
      },
    );
    await assert.rejects(adapter.load("font.ttf", { loader: inherited }), diagnostic("TYPE", "/options/loader"));
    assert.equal(getters, 0);
    assert.equal(loads, 0);
  });

  test(`${adapter.name}: custom load retains its receiver and URI; resolve is validated but not invoked`, async () => {
    const bytes = await fixture(),
      signal = new AbortController().signal;
    const loader: AssetLoader = {
      resolve() {
        throw new Error("Adapter must not resolve on the loader's behalf");
      },
      async load(source, options) {
        assert.equal(this, loader);
        assert.equal(source, "relative.ttf");
        assert.equal(options?.maxBytes, 4 * 1024 * 1024);
        assert.equal(options.signal, signal);
        return bytes;
      },
    };
    const font = await adapter.load("relative.ttf", { loader, signal });
    assert.deepEqual(font.metadata, adapter.prepare(bytes).metadata);
  });

  test(`${adapter.name}: synchronous and asynchronous unstructured transport failures become FONT_LOAD`, async () => {
    for (const thrown of [
      new Error("offline"),
      new TypeError("fetch failed"),
      "offline",
      undefined,
      42,
      Symbol("offline"),
    ]) {
      for (const load of [
        () => {
          throw thrown;
        },
        async () => {
          throw thrown;
        },
      ]) {
        const loader: AssetLoader = { resolve: (uri) => uri, load };
        await assert.rejects(adapter.load("font.ttf", { loader }), diagnostic("FONT_LOAD", "/font/source"));
      }
    }
  });

  test(`${adapter.name}: existing loader DocumentErrors retain identity and AssetErrors retain diagnostic codes`, async () => {
    for (const code of ["FONT_FORMAT", "FONT_RIGHTS", "LIMIT", "TYPE"] as const) {
      const original = new DocumentError(code, "/custom/source", "host validation", { span: { start: 1, end: 4 } });
      const loader: AssetLoader = {
        resolve: (uri) => uri,
        load: async () => {
          throw original;
        },
      };
      await assert.rejects(adapter.load("font.ttf", { loader }), (error: unknown) => error === original);
    }
    for (const code of ["LOAD", "LIMIT", "TYPE", "VALUE"] as const) {
      const loader: AssetLoader = {
        resolve: (uri) => uri,
        load: async () => {
          throw new AssetError(code, "/source", "transport diagnostic");
        },
      };
      await assert.rejects(
        adapter.load("font.ttf", { loader }),
        diagnostic(code === "LOAD" ? "FONT_LOAD" : code, "/font/source"),
      );
    }
  });

  test(`${adapter.name}: returned-byte and font-validation failures are not recast as transport errors`, async () => {
    const bytes = await fixture();
    for (const [value, code] of [
      [new Uint8Array([1, 2, 3]), "FONT_FORMAT"],
      [restricted(bytes), "FONT_RIGHTS"],
      [new Uint8Array(4 * 1024 * 1024 + 1), "LIMIT"],
      [42, "TYPE"],
    ] as const) {
      const loader = malformed({ resolve: (uri: string) => uri, load: async () => value });
      await assert.rejects(adapter.load("font.ttf", { loader }), diagnostic(code));
    }
  });

  test(`${adapter.name}: unknown thrown values are not coerced or inspected for messages`, async () => {
    let reads = 0;
    const thrown = Object.defineProperties(new Error(), {
      message: {
        get() {
          reads++;
          throw new Error("message getter ran");
        },
      },
      toString: {
        value() {
          reads++;
          throw new Error("coercion ran");
        },
      },
    });
    const loader: AssetLoader = {
      resolve: (uri) => uri,
      load: async () => {
        throw thrown;
      },
    };
    await assert.rejects(adapter.load("font.ttf", { loader }), diagnostic("FONT_LOAD", "/font/source"));
    assert.equal(reads, 0);
  });
}
