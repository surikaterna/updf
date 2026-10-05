import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render, renderUnknown } from "@updf/core";
import { ledger } from "@updf/core/internal";
import { literal, name } from "@updf/core/pdf";
import {
  createOwnedResource,
  type ResourceProvider,
  resourceSlot,
  type TextRun,
  type TextRuntime,
  textSlot,
} from "@updf/core/resources";
import { type ComponentContext, h, lower } from "@updf/core/vdom";
import { createTextService, measureText, measureTextUnknown } from "@updf/text";

function runtimeHost() {
  const resource = createOwnedResource({ host: true });
  const runs = new WeakMap<TextRun, string>();
  const produced: TextRun[] = [];
  const own = (text: string) => {
    const run = Object.freeze({}) as TextRun;
    runs.set(run, text);
    produced.push(run);
    return run;
  };
  const runtime: TextRuntime = {
    validateResource(value) {
      assert.equal(value, resource);
    },
    validateText() {},
    fixedPolicy: () => ({ baseline: "ascent", checkInk: false }),
    lineMetrics: () => ({ ascent: 8, descent: 2 }),
    measure: (_resource, text) => ({
      advance: text.length * 5,
      left: 0,
      right: text.length * 5,
      ascent: 8,
      descent: 2,
      top: -8,
      bottom: 2,
      empty: !text,
      run: own(text),
    }),
    joinRuns(input) {
      return input.length === 1 ? input[0]! : own(input.map((run) => runs.get(run)).join(""));
    },
  };
  return { resource, runtime, runs, produced };
}
function runProvider({ resource, runs, produced }: ReturnType<typeof runtimeHost>) {
  const collected: TextRun[] = [];
  const slot = resourceSlot<null>();
  const provider: ResourceProvider = {
    slot,
    collectText(site, collection) {
      assert.ok(produced.includes(site.run));
      const text = runs.get(site.run);
      assert.notEqual(text, undefined);
      collected.push(site.run);
      const binding = collection.intern(slot, resource, () => ({
        category: "Font",
        key: "Host",
        payload: null,
        phase: "content",
        reserve(writer) {
          const ref = writer.reserve();
          return {
            ref,
            define: () => writer.define(ref, { Type: name("Font"), Subtype: name("Type1"), BaseFont: name("Courier") }),
          };
        },
      }));
      collection.bindPainting(site.identity, textSlot, { resource: binding, finish: () => literal(text!) });
    },
  };
  return { provider, collected };
}
function host() {
  const state = runtimeHost();
  const { runtime, resource } = state;
  const { provider, collected } = runProvider(state);
  return {
    ...state,
    collected,
    options: {
      resources: { Host: resource },
      text: createTextService({ runtime, defaultFont: "Host" }),
      providers: [provider],
    },
  };
}
const plain = { kind: "plain", width: 20, text: "AB AB", fontSize: 10, lineHeight: 12, align: "left" } as const;
const paragraph = {
  defaultStyle: { font: "Host", fontSize: 10, color: [0, 0, 0] },
  runs: [{ text: "AB" }],
  lineHeight: 12,
  align: "left",
  whiteSpace: "preserve",
  breakLongWords: "error",
} as const;

function diagnostic(run: () => unknown, code: string, path: string) {
  assert.throws(
    run,
    (error: unknown) =>
      error instanceof DocumentError && error.diagnostics[0]?.code === code && error.diagnostics[0]?.path === path,
  );
}

test("native own undefined font is malformed, while omitted font uses the explicit default", () => {
  const { options } = host();
  const { kind, ...input } = plain;
  assert.equal(kind, "plain");
  const node = { type: "text", x: 0, y: 0, height: 30, ...input } as const;
  const document = (child: unknown) => ({ version: 1, pages: [{ width: 100, height: 100, children: [child] }] });
  diagnostic(() => renderUnknown(document({ ...node, font: undefined }), options), "TYPE", "/pages/0/children/0/font");
  diagnostic(() => measureTextUnknown({ ...plain, font: undefined }, options), "TYPE", "/font");
  const bad = h("text", { ...input, x: 0, y: 0, height: 30, font: undefined as unknown as string });
  diagnostic(
    () =>
      lower(h("document", { version: 1, children: h("page", { width: 100, height: 100, children: bad }) }), options),
    "TYPE",
    "/tree/props/children/props/children/props/font",
  );
  assert.ok(renderUnknown(document(node), options).length);
});

test("runtime intrinsic metrics reject nonfinite values before fixed and rich wrapping", () => {
  const { options, runtime } = host();
  for (const key of ["advance", "left", "right", "ascent", "descent", "top", "bottom"] as const) {
    for (const value of [NaN, Infinity, -Infinity]) {
      const broken = {
        ...runtime,
        measure: (...args: Parameters<TextRuntime["measure"]>) => ({ ...runtime.measure(...args), [key]: value }),
      };
      const text = createTextService({ runtime: broken, defaultFont: "Host" });
      diagnostic(() => measureText(plain, { ...options, text }), "GEOMETRY", `/${key}`);
      diagnostic(
        () => measureText({ kind: "rich", width: 20, paragraphs: [paragraph] }, { ...options, text }),
        "GEOMETRY",
        `/paragraphs/0/runs/0/text/${key}`,
      );
    }
  }
});

test("finite intrinsic values whose fixed baseline composition overflows fail structurally", () => {
  const { options, runtime } = host();
  const huge = {
    ...runtime,
    measure: (...args: Parameters<TextRuntime["measure"]>) => ({
      ...runtime.measure(...args),
      ascent: Number.MAX_VALUE,
    }),
  };
  const text = createTextService({ runtime: huge, defaultFont: "Host" });
  const node = {
    type: "text",
    x: 0,
    y: 1e308,
    width: 20,
    height: 30,
    text: "AB",
    fontSize: 10,
    lineHeight: 12,
    align: "left",
  } as const;
  diagnostic(
    () =>
      render({ version: 1, pages: [{ width: 100, height: Number.MAX_VALUE, children: [node] }] }, { ...options, text }),
    "GEOMETRY",
    "/pages/0/children/0/text/lines/0/y",
  );
});

test("finite service positions reject overflow in page conversion and rich node composition", () => {
  const { options, produced, runtime } = host();
  runtime.measure(options.resources.Host, "AB", 10, "fixed", "");
  const path = "/pages/0/children/0/text";
  const text = {
    ...options.text,
    fixed: (input: Parameters<typeof options.text.fixed>[0]) => ({
      ...input,
      lines: [{ text: "AB", x: 0, y: -Number.MAX_VALUE, run: produced[0]!, path }],
    }),
  };
  const node = {
    type: "text",
    x: 0,
    y: 0,
    width: 20,
    height: 30,
    text: "AB",
    fontSize: 10,
    lineHeight: 12,
    align: "left",
  } as const;
  const document = { version: 1, pages: [{ width: 100, height: 1e308, children: [node] }] } as const;
  diagnostic(() => render(document, { ...options, text }), "GEOMETRY", `${path}/y`);
  const rich = { type: "richText", x: 0, y: 1e308, width: 20, height: 12, paragraphs: [paragraph] } as const;
  const output = options.text.rich(
    { kind: "rich", width: 20, height: 12, paragraphs: [paragraph] },
    { bindings: new Map([["Host", options.resources.Host]]), budget: ledger() },
    "/pages/0/children/0",
  );
  const overflow = {
    ...options.text,
    rich: () => ({ fragments: output.fragments.map((fragment) => ({ ...fragment, baseline: Number.MAX_VALUE })) }),
  };
  diagnostic(
    () =>
      render(
        { version: 1, pages: [{ width: 100, height: Number.MAX_VALUE, children: [rich] }] },
        { ...options, text: overflow },
      ),
    "GEOMETRY",
    `${output.fragments[0]!.path}/y`,
  );
});

test("custom metrics work without any font implementation; native providers receive the exact retained run", () => {
  const { options, collected } = host();
  const measured = measureText(plain, options);
  assert.equal(measured.lineCount, 2);
  assert.equal(measured.lines[0]?.baseline, 8);
  const fixed = { type: "text", x: 0, y: 0, height: 30, ...plain } as const;
  const { kind, ...node } = fixed;
  assert.equal(kind, "plain");
  const document = {
    version: 1,
    pages: [
      {
        width: 100,
        height: 100,
        children: [node, { type: "richText", x: 0, y: 40, width: 20, height: 12, paragraphs: [paragraph] }],
      },
    ],
  } as const;
  const raw = Buffer.from(render(document, options)).toString("latin1");
  assert.match(raw, /\/Host 10 Tf/);
  assert.equal(collected.length, 3);
  assert.equal(new Set(collected).size, 3);
});

test("VDOM measurement uses the selected service and closes retained callbacks", () => {
  const { options } = host();
  let retained: ComponentContext | undefined;
  const component = h((_props: object, context: ComponentContext) => {
    retained = context;
    assert.equal(context.measurement.measureText(plain).lineCount, 2);
    return null;
  }, {});
  lower(h("document", { version: 1, children: h("page", { width: 100, height: 100, children: component }) }), options);
  assert.throws(
    () => retained!.measurement.measureText(plain),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "MEASUREMENT_CONTEXT",
  );
});

test("font omission never selects Helvetica without explicit defaultFont", () => {
  const { options, runtime } = host();
  assert.throws(
    () => measureText(plain, { ...options, text: createTextService({ runtime }) }),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.path === "/font",
  );
  assert.throws(
    () => measureText(plain, { ...options, text: createTextService({ runtime, defaultFont: "Missing" }) }),
    DocumentError,
  );
});

test("service and runtime closures capture callbacks; legitimate callback failures keep their identity", () => {
  const { options, runtime } = host();
  const mutable = { ...options.text };
  const saved = { ...options, text: mutable };
  const sentinel = new Error("host callback");
  const broken = createTextService({
    runtime: {
      ...runtime,
      measure() {
        throw sentinel;
      },
    },
    defaultFont: "Host",
  });
  assert.throws(
    () => measureText(plain, { ...options, text: broken }),
    (error: unknown) => error === sentinel,
  );
  const component = h((_props: object, context: ComponentContext) => {
    mutable.measure = () => {
      throw sentinel;
    };
    assert.equal(context.measurement.measureText(plain).lineCount, 2);
    return null;
  }, {});
  lower(h("document", { version: 1, children: h("page", { width: 100, height: 100, children: component }) }), saved);
});

test("service data outputs are cloned/frozen and malformed numeric output is rejected", () => {
  const { options } = host();
  const result = { width: 20, consumedHeight: 0, lineCount: 0, lines: [] };
  const mutable = { ...options.text, measure: () => result };
  const measured = measureText(plain, { ...options, text: mutable });
  result.width = 100;
  assert.equal(measured.width, 20);
  assert.ok(Object.isFrozen(measured) && Object.isFrozen(measured.lines));
  for (const bad of [
    { ...result, width: Infinity },
    { ...result, consumedHeight: -1 },
    { ...result, lineCount: 1 },
    {},
  ])
    assert.throws(
      () => measureText(plain, { ...options, text: { ...options.text, measure: () => bad as typeof result } }),
      DocumentError,
    );
});

test("service capabilities and returned data reject accessors without invoking them", () => {
  const { options } = host();
  let calls = 0;
  const accessor = Object.defineProperty({}, "measure", {
    enumerable: true,
    get() {
      calls++;
      throw new Error("getter");
    },
  });
  assert.throws(() => measureText(plain, { ...options, text: accessor as typeof options.text }), DocumentError);
  const outputGetter = Object.defineProperty({}, "width", {
    enumerable: true,
    get() {
      calls++;
      throw new Error("output getter");
    },
  });
  assert.throws(
    () =>
      measureText(plain, {
        ...options,
        text: { ...options.text, measure: () => outputGetter as ReturnType<typeof measureText> },
      }),
    DocumentError,
  );
  assert.equal(calls, 0);
});
