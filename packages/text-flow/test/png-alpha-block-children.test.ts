import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { createContext, h, useContext } from "@updf/core/vdom";
import { Block, Column, Row } from "@updf/layout";
import { Image } from "@updf/images";
import { images } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { layoutPrepared, prepareDocument } from "@updf/layout/internal-preparation";
import { textFlow } from "@updf/text-flow";
import { pngAlphaShapes } from "@updf/text-flow/png-alpha";
import { Source } from "@updf/text-flow/sources";
import { transport } from "../../images/test/url-helpers.js";
import { alphaPng } from "./png-shape-fixture.js";
import { document, FloatingBlock } from "./png-alpha-fixture.js";

const bytes = alphaPng(2, 2, [255, 255, 255, 255]);
function selected() {
  const { loader, calls } = transport(bytes);
  const fields: string[] = [];
  const selectedLoader = {
    ...loader,
    resolve(uri: string) {
      fields.push(uri);
      return loader.resolve(uri);
    },
  };
  return {
    calls,
    fields,
    extensions: [
      textFlow({ handlers: [pngAlphaShapes()] }),
      images({ loader: selectedLoader, formatHandlers: [pngImages()] }),
    ],
  };
}
function floating(masked: boolean, children: unknown) {
  return h(
    FloatingBlock,
    {
      style: { width: 80, height: 80, float: "left", ...(masked ? { shapeOutside: Source.url("mask.png") } : {}) },
      children,
    } as never,
    "outer",
  );
}

for (const reserved of [false, true]) {
  test(`canonical Block slots preserve native placements, keys and provider callbacks (reserved=${reserved})`, async () => {
    const Scope = createContext(0);
    const outputs = [];
    for (const masked of [false, true]) {
      const seen: number[] = [];
      const Child = () => {
        seen.push(useContext(Scope));
        return { type: "spacer", height: 10 } as never;
      };
      const children = [h(Block.Body, { children: h(Scope.Provider, { value: 7, children: h(Child, {}) }) })];
      if (reserved) {
        children.unshift(h(Block.Header, { height: 10, children: h(Child, {}) }));
        children.push(h(Block.Footer, { height: 10, children: h(Child, {}) }));
      }
      const f = selected();
      const prepared = await prepareDocument(document([floating(masked, children)]), { extensions: f.extensions });
      assert.deepEqual(seen, [7]);
      const output = layoutPrepared(prepared);
      assert.deepEqual(seen, reserved ? [7, 0, 0] : [7]);
      assert.equal(output.document.pages.length, 1);
      assert.equal(f.calls.fetch, masked ? 1 : 0);
      outputs.push(output);
    }
    assert.deepEqual(outputs[1]!.placements, outputs[0]!.placements);
    assert.deepEqual(outputs[1]!.document, outputs[0]!.document);
  });
}

for (const url of ["mask.png", "child.png"]) {
  test(`Block.Body child Image resolves once before seal (${url})`, async () => {
    let calls = 0;
    const Child = () => {
      calls++;
      return h(Image, { src: url, style: { width: 10, height: 10 } });
    };
    const f = selected();
    const handle = await prepareDocument(document([floating(true, h(Block.Body, { children: h(Child, {}) }))]), {
      extensions: f.extensions,
    });
    assert.equal(calls, 1);
    assert.deepEqual(f.fields, ["mask.png", url]);
    const output = layoutPrepared(handle);
    assert.equal(calls, 1);
    assert.equal(f.calls.fetch, url === "mask.png" ? 1 : 2);
    assert.equal(f.calls.policy, url === "mask.png" ? 3 : 4);
    assert.equal(Object.keys(output.options.resources).length, url === "mask.png" ? 2 : 3);
    assert.deepEqual(
      Object.values(output.options.resources).map((resource) => Object.hasOwn(resource.metadata as object, "shape")),
      url === "mask.png" ? [false, true] : [false, true, false],
    );
    const pdf = Buffer.from(render(output.document, output.options)).toString("latin1");
    assert.equal((pdf.match(/\/X\d+ Do/gu) ?? []).length, 1);
    assert.equal((pdf.match(/\/Subtype \/Image/gu) ?? []).length, 2);
  });
}

test("captured canonical Block roots retain ordinary numeric/text and descendant-parent grammar", async () => {
  for (const masked of [false, true]) {
    for (const invalid of [1, "text", h(Block.Body, { children: h(Block.Body, {}) })]) {
      const f = selected();
      await assert.rejects(
        prepareDocument(document([floating(masked, invalid)]), { extensions: f.extensions }),
        DocumentError,
      );
      assert.equal(f.calls.fetch, 0);
    }
    const f = selected();
    await assert.rejects(
      prepareDocument(document([h(Block.Body, {}), floating(masked, [])]), { extensions: f.extensions }),
      (e: unknown) => e instanceof DocumentError && e.diagnostics[0]!.code === "VDOM_HIERARCHY",
    );
    assert.equal(f.calls.fetch, 0);
  }
});

test("retained Block children keep raw-data snapshots and deferred Column provider scopes without replay", async () => {
  const Scope = createContext(0);
  const outputs = [];
  for (const masked of [false, true]) {
    const seen: number[] = [];
    const raw = { type: "block", style: { height: 10 }, children: [{ type: "spacer", height: 1 }] };
    const Child = () => {
      seen.push(useContext(Scope));
      return raw as never;
    };
    const body = h(Block.Body, {
      children: h(Scope.Provider, {
        value: 3,
        children: h(Row, {
          children: h(Column, {
            children: h(Scope.Provider, { value: 9, children: h(Child, {}, "shared") }),
          }),
        }),
      }),
    });
    const f = selected();
    const pending = prepareDocument(document([floating(masked, body)]), { extensions: f.extensions });
    raw.style.height = 40;
    const handle = await pending;
    assert.equal(Object.isFrozen(raw), false);
    assert.equal(Object.isFrozen(raw.style), false);
    outputs.push(layoutPrepared(handle));
    assert.deepEqual(seen, [9]);
  }
  assert.deepEqual(outputs[1]!.placements, outputs[0]!.placements);
  assert.deepEqual(outputs[1]!.document, outputs[0]!.document);
});

test("malformed later Block descendants suppress earlier resource resolution and reserved callbacks", async () => {
  for (const masked of [false, true]) {
    let late = 0;
    const header = h(Block.Header, {
      height: 10,
      children: h(() => {
        late++;
        return null;
      }, {}),
    });
    const f = selected();
    const body = h(Block.Body, {
      children: [h(Image, { src: "child.png", style: { width: 10, height: 10 } }), h(Block.Body, {})],
    });
    await assert.rejects(
      prepareDocument(document([floating(masked, [header, body])]), { extensions: f.extensions }),
      (e: unknown) => e instanceof DocumentError && e.diagnostics[0]!.code === "VDOM_HIERARCHY",
    );
    assert.equal(late, 0);
    assert.equal(f.calls.fetch, 0);
  }
});
