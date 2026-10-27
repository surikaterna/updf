import assert from "node:assert/strict";
import test from "node:test";
import { AssetError } from "@updf/assets";
import { DocumentError } from "@updf/core";
import { h } from "@updf/core/vdom";
import { Block } from "@updf/layout";
import { renderAsync } from "@updf/layout/async";
import { images } from "@updf/images/load";
import { authored } from "../../layout/test/preparation-fixture.js";
import { controlled, flush, image, render } from "./cache-helpers.js";

const direct = "/document/children/children/src";
const nested = "/document/children/children/children/src";
const caught = (promise: Promise<unknown>) =>
  promise.then(
    () => assert.fail("Expected failure"),
    (error: unknown) => error,
  );

test("shared real PNG decoder failure has independent authored errors, no publication, and a fresh retry", async () => {
  const state = controlled();
  const first = caught(renderAsync(authored(image()), { extensions: [images(state.config)] }));
  const second = caught(renderAsync(authored(h(Block, { children: image() })), { extensions: [images(state.config)] }));
  await flush();
  assert.equal(state.jobs.length, 1);
  assert.equal(state.config.cache.snapshot().consumers, 2);
  state.jobs[0]!.resolve(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
  const errors = await Promise.all([first, second]);
  for (const [index, error] of errors.entries()) {
    assert.ok(error instanceof DocumentError);
    assert.equal(error.diagnostics[0]!.code, "PNG_DATA");
    assert.equal(error.diagnostics[0]!.path, index ? nested : direct);
  }
  assert.notEqual(errors[0], errors[1]);
  const a = errors[0] as DocumentError;
  const b = errors[1] as DocumentError;
  Object.assign(a.diagnostics[0]!, { path: "changed", message: "changed" });
  assert.equal(b.diagnostics[0]!.path, nested);
  assert.notEqual(b.diagnostics[0]!.message, "changed");
  assert.equal(state.config.cache.snapshot().entries, 0);
  const retry = render(state.config);
  await flush();
  assert.equal(state.jobs.length, 2);
  state.complete(1);
  assert.ok((await retry).length > 0);
});

test("AssetError LOAD and unexpected errors preserve classification and identity conventions", async () => {
  for (const base of [new AssetError("LOAD", "/source/7", "transport failed"), new Error("unexpected")]) {
    const state = controlled();
    const failed = caught(renderAsync(authored(image()), { extensions: [images(state.config)] }));
    await flush();
    state.jobs[0]!.reject(base);
    const error = await failed;
    if (!(base instanceof AssetError)) assert.equal(error, base);
    else {
      assert.ok(error instanceof AssetError);
      assert.notEqual(error, base);
      assert.equal(error.code, "LOAD");
      assert.equal(error.message, base.message);
      assert.equal(error.path, `${direct}/7`);
      assert.equal(base.path, "/source/7");
    }
  }
});

test("structured remapping preserves every diagnostic, span, absolute owner path and independent storage", async () => {
  const base = new DocumentError("PATH_SYNTAX", "/source/17", "parser", { span: { start: 2, end: 5 } });
  const absolute = new DocumentError("PHASE", nested, "closed");
  Object.defineProperty(base, "diagnostics", { value: [...base.diagnostics, ...absolute.diagnostics] });
  const state = controlled();
  const first = caught(renderAsync(authored(image()), { extensions: [images(state.config)] }));
  const second = caught(renderAsync(authored(h(Block, { children: image() })), { extensions: [images(state.config)] }));
  await flush();
  assert.equal(state.jobs.length, 1);
  state.jobs[0]!.reject(base);
  const a = (await first) as DocumentError;
  const b = (await second) as DocumentError;
  assert.notEqual(a, base);
  assert.notEqual(a, b);
  assert.equal(a.diagnostics.length, 2);
  assert.equal(a.diagnostics[0]!.path, `${direct}/17`);
  assert.equal(a.diagnostics[1]!.path, nested);
  assert.deepEqual(a.diagnostics[0]!.span, base.diagnostics[0]!.span);
  assert.notEqual(a.diagnostics[0]!.span, base.diagnostics[0]!.span);
  Object.assign(a.diagnostics[0]!, { message: "changed" });
  assert.equal(base.message, "parser");
  assert.equal(b.diagnostics[0]!.message, "parser");
});

test("uncached signature and occurrence policy failures keep their codes at nested source fields", async () => {
  for (const code of ["RESOURCE", "VALUE", "LIMIT"] as const) {
    const state = controlled();
    const config = {
      loader:
        code === "RESOURCE"
          ? state.config.loader
          : {
              ...state.config.loader,
              resolve() {
                throw new AssetError(code, "/source", "policy denied");
              },
            },
      formatHandlers: state.config.formatHandlers,
    };
    const failed = caught(renderAsync(authored(h(Block, { children: image() })), { extensions: [images(config)] }));
    if (code === "RESOURCE") {
      await flush();
      state.jobs[0]!.resolve(new Uint8Array([0]));
    }
    const error = await failed;
    if (code === "RESOURCE") {
      assert.ok(error instanceof DocumentError);
      assert.equal(error.diagnostics[0]!.code, code);
      assert.equal(error.diagnostics[0]!.path, nested);
    } else {
      assert.ok(error instanceof AssetError);
      assert.equal(error.code, code);
      assert.equal(error.path, nested);
      assert.equal(state.jobs.length, 0);
    }
  }
});

test("a cancelled first consumer cannot lend its occurrence path to the active shared failure", async () => {
  const state = controlled();
  const controller = new AbortController();
  const first = caught(render(state.config, undefined, controller));
  const second = caught(renderAsync(authored(h(Block, { children: image() })), { extensions: [images(state.config)] }));
  await flush();
  assert.equal(state.jobs.length, 1);
  controller.abort();
  const aborted = await first;
  assert.ok(aborted instanceof DocumentError);
  assert.equal(aborted.diagnostics[0]!.code, "MEASUREMENT_CONTEXT");
  const base = new DocumentError("LIMIT", "/images/load", "transport budget");
  state.jobs[0]!.reject(base);
  const active = await second;
  assert.ok(active instanceof DocumentError);
  assert.notEqual(active, base);
  assert.equal(active.diagnostics[0]!.path, nested);
  assert.equal(active.diagnostics[0]!.code, "LIMIT");
  assert.equal(base.diagnostics[0]!.path, "/images/load");
  assert.equal(state.config.cache.snapshot().entries, 0);
});
