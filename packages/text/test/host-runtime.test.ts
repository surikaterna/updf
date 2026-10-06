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
import { createTextMeasurer, createTextService, measureText, measureTextUnknown } from "@updf/text";
import { richInput } from "../../../tests/fixtures/rich-input.js";

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
    measurementOptions: {
      resources: { Host: resource },
      measurer: createTextMeasurer({ runtime }),
    },
    options: {
      resources: { Host: resource },
      text: createTextService({ runtime, defaultFont: "Host" }),
      providers: [provider],
    },
  };
}
const plain = richInput("AB AB", 20, 10, 12, "Host");
const native = richInput("AB AB", 20, 10, 12, "Host");
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

test("native paragraph font is explicit; own undefined is malformed even with a service default", () => {
  const { options, measurementOptions } = host();
  const input = native;
  const node = { type: "richText", x: 0, y: 0, ...input, height: 30 } as const;
  const document = (child: unknown) => ({ version: 1, pages: [{ width: 100, height: 100, children: [child] }] });
  const malformed = {
    ...node,
    paragraphs: [{ ...paragraph, defaultStyle: { ...paragraph.defaultStyle, font: undefined } }],
  };
  diagnostic(
    () => renderUnknown(document(malformed), options),
    "TYPE",
    "/pages/0/children/0/paragraphs/0/defaultStyle/font",
  );
  diagnostic(
    () =>
      renderUnknown(
        document({ ...node, paragraphs: [{ ...paragraph, defaultStyle: { fontSize: 10, color: [0, 0, 0] } }] }),
        options,
      ),
    "TYPE",
    "/pages/0/children/0/paragraphs/0/defaultStyle/font",
  );
  diagnostic(
    () =>
      measureTextUnknown(
        { width: 20, paragraphs: [{ ...paragraph, defaultStyle: { ...paragraph.defaultStyle, font: undefined } }] },
        measurementOptions,
      ),
    "TYPE",
    "/paragraphs/0/defaultStyle/font",
  );
  const { type: _type, ...props } = malformed;
  const bad = h("richText", props as never);
  diagnostic(
    () =>
      lower(h("document", { version: 1, children: h("page", { width: 100, height: 100, children: bad }) }), options),
    "TYPE",
    "/tree/props/children/props/children/props/paragraphs/0/defaultStyle/font",
  );
  assert.ok(renderUnknown(document(node), options).length);
});

test("runtime intrinsic metrics reject nonfinite values before native and standalone rich wrapping", () => {
  const { measurementOptions, runtime } = host();
  for (const key of ["advance", "left", "right", "ascent", "descent", "top", "bottom"] as const) {
    for (const value of [NaN, Infinity, -Infinity]) {
      const broken = {
        ...runtime,
        measure: (...args: Parameters<TextRuntime["measure"]>) => ({ ...runtime.measure(...args), [key]: value }),
      };
      const measurer = createTextMeasurer({ runtime: broken });
      const service = createTextService({ runtime: broken, defaultFont: "Host" });
      diagnostic(
        () =>
          service.rich(
            native,
            { bindings: new Map(Object.entries(measurementOptions.resources)), budget: ledger() },
            "",
          ),
        "GEOMETRY",
        `/paragraphs/0/runs/0/text/${key}`,
      );
      diagnostic(
        () => measureText({ width: 20, paragraphs: [paragraph] }, { ...measurementOptions, measurer }),
        "GEOMETRY",
        `/paragraphs/0/runs/0/text/${key}`,
      );
    }
  }
});

test("finite oversized intrinsic ascent rejects at the rich envelope before baseline composition", () => {
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
    type: "richText",
    x: 0,
    y: 1e308,
    width: 20,
    height: 30,
    paragraphs: [paragraph],
  } as const;
  diagnostic(
    () =>
      render({ version: 1, pages: [{ width: 100, height: Number.MAX_VALUE, children: [node] }] }, { ...options, text }),
    "FONT_INK",
    "/pages/0/children/0/paragraphs/0/lineHeight",
  );
});

test("finite service positions reject overflow in page conversion and rich node composition", () => {
  const { options } = host();
  const node = {
    type: "richText",
    x: 0,
    y: 0,
    width: 20,
    height: 30,
    paragraphs: [paragraph],
  } as const;
  const document = { version: 1, pages: [{ width: 100, height: 1e308, children: [node] }] } as const;
  const rich = { type: "richText", x: 0, y: 1e308, width: 20, height: 12, paragraphs: [paragraph] } as const;
  const output = options.text.rich(
    { width: 20, height: 12, paragraphs: [paragraph] },
    { bindings: new Map([["Host", options.resources.Host]]), budget: ledger() },
    "/pages/0/children/0",
  );
  const overflow = {
    ...options.text,
    rich: () => ({ fragments: output.fragments.map((fragment) => ({ ...fragment, baseline: Number.MAX_VALUE })) }),
  };
  const pageOverflow = {
    ...options.text,
    rich: () => ({ fragments: output.fragments.map((fragment) => ({ ...fragment, baseline: -Number.MAX_VALUE })) }),
  };
  diagnostic(() => render(document, { ...options, text: pageOverflow }), "GEOMETRY", `${output.fragments[0]!.path}/y`);
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
  const { options, measurementOptions, collected } = host();
  const measured = measureText(plain, measurementOptions);
  assert.equal(measured.lineCount, 2);
  assert.equal(measured.lines[0]?.baseline, 9);
  const node = { type: "richText", x: 0, y: 0, ...native, height: 30 } as const;
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
  assert.match(raw, /\/F1 10 Tf/);
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

test("measurement requires explicit paragraph font even when a service default is configured", () => {
  const { measurementOptions, runtime } = host();
  assert.throws(
    () =>
      measureTextUnknown(
        { width: 20, paragraphs: [{ ...paragraph, defaultStyle: { fontSize: 10, color: [0, 0, 0] } }] },
        { ...measurementOptions, measurer: createTextMeasurer({ runtime }) },
      ),
    (error: unknown) =>
      error instanceof DocumentError && error.diagnostics[0]?.path === "/paragraphs/0/defaultStyle/font",
  );
  assert.throws(
    () =>
      createTextMeasurer({ runtime, defaultFont: "Missing" } as unknown as Parameters<typeof createTextMeasurer>[0]),
    DocumentError,
  );
});

test("service and runtime closures capture callbacks; legitimate callback failures keep their identity", () => {
  const { options, measurementOptions, runtime } = host();
  const mutable = { ...options.text };
  const saved = { ...options, text: mutable };
  const sentinel = new Error("host callback");
  const broken = createTextMeasurer({
    runtime: {
      ...runtime,
      measure() {
        throw sentinel;
      },
    },
  });
  assert.throws(
    () => measureText(plain, { ...measurementOptions, measurer: broken }),
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
  const { measurementOptions } = host();
  const result = { width: 20, consumedHeight: 0, lineCount: 0, lines: [] };
  const mutable = { measure: () => result };
  const measured = measureText(plain, { ...measurementOptions, measurer: mutable });
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
      () => measureText(plain, { ...measurementOptions, measurer: { measure: () => bad as typeof result } }),
      DocumentError,
    );
});

test("service capabilities and returned data reject accessors without invoking them", () => {
  const { measurementOptions } = host();
  let calls = 0;
  const accessor = Object.defineProperty({}, "measure", {
    enumerable: true,
    get() {
      calls++;
      throw new Error("getter");
    },
  });
  assert.throws(
    () => measureText(plain, { ...measurementOptions, measurer: accessor as typeof measurementOptions.measurer }),
    DocumentError,
  );
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
        ...measurementOptions,
        measurer: { measure: () => outputGetter as ReturnType<typeof measureText> },
      }),
    DocumentError,
  );
  assert.equal(calls, 0);
});
