import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { createOwnedResource } from "@updf/core/resources";
import { h, lower } from "@updf/core/vdom";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import {
  createExtensions,
  Document,
  defineBlockAdapter,
  document,
  extension,
  flow,
  layout,
  measure,
  Paragraph,
  paragraph,
} from "@updf/layout";
import { createTextService } from "@updf/text";

function composition(defaultFont?: string) {
  const runtime = fontRuntime();
  return {
    resources: { Custom: createHelvetica() },
    text: createTextService({ runtime, ...(defaultFont === undefined ? {} : { defaultFont }) }),
    providers: [fontProvider(runtime)],
  };
}
function diagnostic(invoke: () => unknown, code: string, path: string) {
  assert.throws(
    invoke,
    (error: unknown) =>
      error instanceof DocumentError && error.diagnostics[0]?.code === code && error.diagnostics[0]?.path === path,
  );
}
test("authoring selects only the injected service default and keeps one runtime through final rendering", () => {
  const options = composition("Custom");
  const prose = paragraph({ children: "A B", style: { fontSize: 10 } });
  const measured = measure(prose, { width: 100 }, options);
  const fragment = measured.lines[0]?.fragments[0];
  assert.ok(fragment && "style" in fragment);
  assert.equal(fragment.style.font, "Custom");
  const input = document({
    children: flow({
      pageSize: { width: 100, height: 100 },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      children: prose,
    }),
  });
  const jsx = h(Document, input.props);
  assert.deepEqual(render(layout(input, options).document, options), render(lower(jsx, options), options));
  assert.match(new TextDecoder().decode(render(lower(jsx, options), options)), /\/BaseFont \/Helvetica/u);
});
test("authoring never invents a font or service, including empty paragraphs", () => {
  const input = paragraph({ children: "" });
  diagnostic(() => measure(input, { width: 100 }), "FONT_RESOURCE", "/content/style");
  diagnostic(() => measure(input, { width: 100 }, composition()), "FONT_RESOURCE", "/content/style/font");
});
test("own undefined font rejects at the original author path before service default selection", () => {
  const input = h(Paragraph, { style: { font: undefined } as never, children: "" });
  diagnostic(() => measure(input, { width: 100 }, composition("Custom")), "TYPE", "/content/style/font");
});
test("generic owned handles retain exact identity in authoring snapshots and adapter props", () => {
  const handle = createOwnedResource({ kind: "application", value: 1 });
  const adapter = defineBlockAdapter<{ handle: typeof handle }>({
    name: "owned-handle-probe",
    validate: (input) => input as { handle: typeof handle },
    measure(props) {
      assert.equal(props.handle, handle);
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 1, height: 1 },
        fragment: () => ({ status: "placed", nextOffset: 1, height: 1, nodes: [] }),
      };
    },
  });
  const input = document({
    children: flow({
      pageSize: { width: 100, height: 100 },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      extensions: createExtensions([adapter]),
      children: extension(adapter, { handle }),
    }),
  });
  const options = { resources: { Probe: handle } };
  assert.equal(layout(input, options).pageCount, 1);
  assert.doesNotMatch(new TextDecoder().decode(render(layout(input, options).document, options)), /\/Type \/Font/u);
});
test("style resolution callbacks are captured, bound to the original service, and reject getters", () => {
  const options = composition("Custom");
  const original = options.text.resolveStyle;
  const service = {
    ...options.text,
    selected: "Custom",
    resolveStyle(...args: Parameters<typeof original>) {
      assert.equal(this, service);
      assert.equal(this.selected, "Custom");
      service.resolveStyle = () => {
        throw new Error("replacement must not execute");
      };
      return original(...args);
    },
  };
  measure([paragraph({ children: "A" }), paragraph({ children: "B" })], { width: 100 }, { ...options, text: service });
  let getters = 0;
  Object.defineProperty(service, "resolveStyle", {
    get() {
      getters++;
      return original;
    },
  });
  diagnostic(
    () => measure(paragraph({ children: "A" }), { width: 100 }, { ...options, text: service }),
    "TYPE",
    "/options/text/resolveStyle",
  );
  assert.equal(getters, 0);
});
