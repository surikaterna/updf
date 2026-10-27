import assert from "node:assert/strict";
import test from "node:test";
import { createOperationCapability, defineOperationExtension } from "@updf/core/internal";
import { createContext, h, useContext } from "@updf/core/vdom";
import { Image, images as preparedImages } from "@updf/images";
import { images } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { Block, Column, Row, Paragraph, Flow, createExtensions, defineBlockAdapter, extension } from "@updf/layout";
import { renderAsync } from "@updf/layout/async";
import { render } from "@updf/layout/render";
import { floatable, textFlow } from "@updf/text-flow";
import { Source } from "@updf/text-flow/sources";
import { preparePng, pngProvider } from "@updf/png";
import { authored } from "../../layout/test/preparation-fixture.js";
import { fixture } from "../../png/test/helpers.js";
import { transport } from "./url-helpers.js";
import { textOptions } from "../../../tests/fixtures/text-options.js";

test("dynamic reused occurrences retain provider scopes inside kept Body and Column, evaluated once", async () => {
  const Scope = createContext("none");
  const observed: string[] = [];
  function Dynamic() {
    const scope = useContext(Scope);
    observed.push(scope);
    return h(Image, { src: `${scope}.png`, style: { width: 20, height: 20, padding: 1 } });
  }
  const child = h(Dynamic, {});
  const input = authored([
    h(Scope.Provider, {
      value: "left",
      children: h(Block, { keepTogether: true, children: h(Block.Body, { children: child }) }),
    }),
    h(Scope.Provider, { value: "right", children: h(Row, { children: h(Column, { children: child }) }) }),
  ]);
  const { loader, calls } = transport();
  assert.ok((await renderAsync(input, { extensions: [images({ loader, formatHandlers: [pngImages()] })] })).length);
  assert.deepEqual(observed, ["left", "right"]);
  assert.equal(calls.fetch, 2);
});

test("floatable URL Image preserves exclusion and canonical actual-size geometry against prepared control", async () => {
  const Floating = floatable(Image);
  const style = { width: 40, height: 40, paddingTop: 1.1, paddingBottom: 0.1, float: "right" as const };
  const tree = (src: string | Awaited<ReturnType<typeof preparePng>>) =>
    authored([h(Floating, { src, style }), h(Paragraph, { children: "text around an actual URL image ".repeat(12) })]);
  const base = textOptions({});
  const { loader, calls } = transport();
  const result = await renderAsync(tree("logo"), {
    ...base,
    extensions: [images({ loader, formatHandlers: [pngImages()] }), textFlow()],
  });
  const src = await preparePng(fixture());
  assert.deepEqual(
    result,
    render(tree(src), {
      ...base,
      resources: { ...base.resources, Prepared0: src },
      providers: [...(base.providers ?? []), pngProvider()],
      extensions: [preparedImages(), textFlow()],
    }),
  );
  assert.equal(calls.fetch, 1);
});

test("opaque adapters reject late URL without fetch; late prepared handles are still supported", async () => {
  const src = await preparePng(fixture());
  for (const source of ["late", src]) {
    const { loader, calls } = transport();
    const adapter = defineBlockAdapter({
      name: "OpaqueImage",
      validate: (v) => v,
      measure(_props, context) {
        const result = context.measureContent(h(Image, { src: source, style: { width: 20, height: 20 } }), {
          width: context.width,
        });
        return {
          fragmentation: "atomic",
          extent: 1,
          naturalSize: result.size,
          next: () => ({ end: 1, height: result.size.height, nodes: result.nodes }),
        };
      },
    });
    const input = authored(extension(adapter, {}) as never);
    const installation = defineOperationExtension(
      {},
      createOperationCapability(() => () => null),
      createExtensions([adapter]),
    );
    const pending = renderAsync(input, {
      resources: { logo: src },
      extensions: [images({ loader, formatHandlers: [pngImages()] }), installation],
    });
    if (typeof source === "string") await assert.rejects(pending, /after preparation sealed/u);
    else assert.ok((await pending).length > 100);
    assert.equal(calls.fetch, 0);
  }
});

test("URL exclusion sources remain independently unsupported and never trigger loading", async () => {
  const src = await preparePng(fixture());
  const Floating = floatable(Image);
  const { loader, calls } = transport();
  const input = authored(
    h(Floating, {
      src,
      style: {
        width: 20,
        height: 20,
        float: "left",
        shapeOutside: Source.url("mask.png"),
      },
    }),
  );
  await assert.rejects(
    renderAsync(input, {
      resources: { logo: src },
      extensions: [images({ loader, formatHandlers: [pngImages()] }), textFlow()],
    }),
    /not implemented/u,
  );
  assert.equal(calls.fetch, 0);
});

test("final header URL fails with a sourced phase error, no late fetch and no returned PDF", async () => {
  const { loader, calls } = transport();
  let callbacks = 0;
  const late = () => {
    callbacks++;
    return h(Image, { src: "late", style: { width: 20, height: 20 } });
  };
  const input = authored(h(Flow.Header, { height: 20, children: h(late, {}) }));
  await assert.rejects(
    renderAsync(input, { extensions: [images({ loader, formatHandlers: [pngImages()] })] }),
    (error: unknown) => error instanceof Error && error.message.includes("after preparation sealed"),
  );
  assert.equal(callbacks, 1);
  assert.equal(calls.fetch, 0);
});
