import assert from "node:assert/strict";
import test from "node:test";
import { render } from "@updf/core";
import { createTextService } from "@updf/text";
import { fixtureFont, fontDocument, fontParagraph, fontText } from "../../../tests/fixtures/fonts/font-fixture.js";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";

test("installed provider and bound fonts produce no Font objects for drawing-only pages", async () => {
  const runtime = fontRuntime();
  const document = {
    version: 1,
    pages: [{ width: 100, height: 100, children: [{ type: "rect", x: 0, y: 0, width: 10, height: 10 }] }],
  } as const;
  const raw = Buffer.from(
    render(document, {
      resources: { Helvetica: createHelvetica(), Demo: await fixtureFont() },
      text: createTextService({ runtime }),
      providers: [fontProvider(runtime)],
    }),
  ).toString("latin1");
  assert.doesNotMatch(raw, /\/Font|\/BaseFont|\/FontFile/);
});

test("only committed embedded text emits a font when Helvetica is bound but unused", async () => {
  const runtime = fontRuntime();
  const raw = Buffer.from(
    render(fontDocument([fontText("A")]), {
      resources: { Helvetica: createHelvetica(), Demo: await fixtureFont() },
      text: createTextService({ runtime }),
      providers: [fontProvider(runtime)],
    }),
  ).toString("latin1");
  assert.equal((raw.match(/\/Subtype \/Type0/g) ?? []).length, 1);
  assert.doesNotMatch(raw, /\/BaseFont \/Helvetica|\/F1 /);
  assert.match(raw, /\/F2 /);
});

test("aliases of explicit Helvetica share one lazily committed F1", () => {
  const runtime = fontRuntime();
  const font = createHelvetica();
  const raw = Buffer.from(
    render(
      fontDocument([
        fontText("A", { paragraphs: [fontParagraph("A", "One")] }),
        fontText("B", { paragraphs: [fontParagraph("B", "Two")], y: 100 }),
      ]),
      {
        resources: { One: font, Two: font },
        text: createTextService({ runtime }),
        providers: [fontProvider(runtime)],
      },
    ),
  ).toString("latin1");
  assert.equal((raw.match(/\/BaseFont \/Helvetica/g) ?? []).length, 1);
  assert.equal((raw.match(/\/F1 16 Tf/g) ?? []).length, 2);
});
