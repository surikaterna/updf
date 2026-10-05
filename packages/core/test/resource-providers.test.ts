import assert from "node:assert/strict";
import test from "node:test";
import type { OperationOptions } from "@updf/core";
import { render } from "@updf/core";
import { fontProvider, fontRuntime } from "@updf/fonts";
import { createTextService } from "@updf/text";
import { fixtureFont, fontDocument, fontText } from "../../../tests/fixtures/fonts/font-fixture.js";
import { fontOptions } from "../../../tests/fixtures/fonts/font-options.js";
import { defaultResources } from "../dist/core/default-resources.js";
import { documentResources } from "../dist/core/document-resources.js";
import { measure } from "../dist/core/measure.js";
import { operation } from "../dist/core/operation.js";
import type { MeasuredPage } from "../dist/core/plan.js";
import { serialize } from "../dist/core/serialize.js";
import { textSlot } from "../dist/core/text-paint.js";
import type { ResolvedTextResources } from "../dist/core/text-resources.js";
import { alphaAt } from "../dist/painting/alpha.js";

test("provider capabilities retain the original mutable receiver but not later method replacements", () => {
  const original = {
    slot: {},
    count: 0,
    initialize() {
      assert.equal(this, original);
      this.count++;
    },
  };
  const owned = operation({ providers: [original] });
  const captured = owned.providers[0];
  assert.ok(captured);
  assert.ok(Object.isFrozen(captured));
  assert.equal(Object.getPrototypeOf(captured), null);
  assert.deepEqual(Object.keys(captured), ["slot", "initialize"]);
  original.initialize = () => {
    throw new Error("replacement invoked");
  };
  documentResources([], owned.providers);
  documentResources([], owned.providers);
  assert.equal(original.count, 2);
});

function resolved(options: OperationOptions): ResolvedTextResources {
  return operation(options).fonts;
}
function collected(pages: readonly MeasuredPage[], options: OperationOptions) {
  return defaultResources(pages, options.providers ?? [], resolved(options).bindings);
}

test("final lines use alias identity, include later-page CIDs and exclude discarded measurements", async () => {
  const font = await fixtureFont(),
    other = await fixtureFont(),
    unused = await fixtureFont();
  const options = fontOptions({ resources: { Demo: font, Alias: font, Other: other, Unused: unused } });
  const fonts = resolved(options);
  const discarded = measure(fontDocument([fontText("Z")]), fonts);
  const first = measure(fontDocument([fontText("A"), fontText("B", { font: "Alias", y: 100 })]), fonts)[0];
  const second = measure(fontDocument([fontText("C"), fontText("D", { font: "Other", y: 100 })]), fonts)[0];
  assert.ok(first && second);
  const resources = collected([first, second], options);
  const raw = Buffer.from(serialize([first, second], resources)).toString("latin1");
  assert.equal((raw.match(/\/Subtype \/Type0/g) ?? []).length, 2);
  assert.match(raw, /<0003> <0043>/);
  assert.doesNotMatch(raw, /<005a>/);
  const firstNode = first.children[0],
    laterNode = second.children[0],
    lostNode = discarded[0]?.children[0];
  assert.ok(firstNode?.type === "text" && laterNode?.type === "text" && lostNode?.type === "text");
  const firstLine = firstNode.lines[0],
    laterLine = laterNode.lines[0],
    lostLine = lostNode.lines[0];
  assert.ok(firstLine && laterLine && lostLine);
  assert.equal(resources.page(first).painting(firstLine, textSlot).key, "F2");
  assert.throws(() => resources.page(first).painting(laterLine, textSlot), /Missing/);
  assert.throws(() => resources.page(first).painting(lostLine, textSlot), /Missing/);
  assert.deepEqual(
    serialize([first, second], resources),
    serialize([first, second], collected([first, second], options)),
  );
});

test("production providers share preorder bindings without reserving unused Helvetica", async () => {
  const font = await fixtureFont();
  const drawing = {
    type: "rect",
    x: 0,
    y: 0,
    width: 20,
    height: 20,
    paint: { fill: [1, 0, 0], stroke: null, fillOpacity: 0.5 },
  } as const;
  const group = { type: "paintGroup", children: [drawing, fontText("A")] } as const;
  const page = { width: 595, height: 842, children: [group] };
  const document = { version: 1, pages: [page, page] } as const;
  const options = fontOptions({ resources: { Demo: font } });
  const pages = measure(document, resolved(options)),
    first = pages[0],
    second = pages[1];
  assert.ok(first && second);
  const resources = collected(pages, options);
  const node = first.children[0];
  assert.ok(node?.type === "paintGroup");
  const painted = node.children[0];
  assert.ok(painted?.type === "rect" && painted.painting);
  const resolvedDrawing = painted.painting;
  assert.equal(alphaAt(resources.page(first), resolvedDrawing), "GS1");
  assert.throws(() => alphaAt(resources.page(second), resolvedDrawing), /Missing/);
  const bytes = render(document, options),
    raw = Buffer.from(bytes).toString("latin1");
  assert.match(raw, /\/Font << \/F2 \d+ 0 R >> \/ExtGState << \/GS1 \d+ 0 R >>/);
  assert.doesNotMatch(raw, /\/BaseFont \/Helvetica|\/F1 /);
  assert.equal((raw.match(/\/GS1 gs/g) ?? []).length, 2);
  assert.deepEqual(bytes, serialize(pages, resources));
});

test("geometry-only has no implicit Helvetica and default alpha has no resource", () => {
  const children = [
    {
      type: "rect",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      paint: { fill: [1, 0, 0], stroke: [0, 0, 0], width: 0, strokeOpacity: 0.3 },
    },
  ] as const;
  const document = { version: 1, pages: [{ width: 100, height: 100, children }] } as const;
  const raw = Buffer.from(render(document)).toString("latin1");
  assert.doesNotMatch(raw, /\/Font|\/BaseFont \/Helvetica/);
  assert.doesNotMatch(raw, /ExtGState| gs/);
});

test("rich fragments bind final encodings with shared measured objects across pages and renders", async () => {
  const font = await fixtureFont();
  const paragraph = {
    defaultStyle: { font: "Demo", fontSize: 16, color: [0, 0, 0] },
    runs: [{ text: "AB" }, { text: "C", style: { font: "Helvetica" } }],
    lineHeight: 24,
    align: "left",
    whiteSpace: "preserve",
    breakLongWords: "error",
  } as const;
  const rich = { type: "richText", x: 20, y: 20, width: 400, height: 100, paragraphs: [paragraph] } as const;
  const document = { version: 1, pages: [{ width: 595, height: 842, children: [rich] }] } as const;
  const options = fontOptions({ resources: { Demo: font } });
  const first = measure(document, resolved(options))[0];
  assert.ok(first);
  const node = first.children[0];
  assert.ok(node?.type === "richText");
  const fragment = node.fragments[0],
    builtin = node.fragments[1];
  assert.ok(fragment && builtin);
  const shared = { ...first };
  const resources = collected([first, shared], options);
  assert.equal(resources.page(first).painting(fragment, textSlot).key, "F2");
  assert.equal(resources.page(shared).painting(fragment, textSlot).key, "F2");
  assert.equal(resources.page(shared).painting(builtin, textSlot).key, "F1");
  const next = collected([first], options);
  assert.deepEqual(serialize([first], next), serialize([first], collected([first], options)));
  assert.throws(() => next.page(shared), /Foreign/);
});

test("reused provider resets document state while previous lazy bindings retain their own CIDs", async () => {
  const font = await fixtureFont();
  const runtime = fontRuntime();
  const fonts = resolved({ resources: { Demo: font }, text: createTextService({ runtime }) });
  const first = measure(fontDocument([fontText("A")]), fonts)[0];
  const second = measure(fontDocument([fontText("B")]), fonts)[0];
  assert.ok(first && second);
  const provider = fontProvider(runtime);
  const one = documentResources([first], [provider]);
  const two = documentResources([second], [provider]);
  const raw = Buffer.from(serialize([first], one)).toString("latin1");
  const later = Buffer.from(serialize([second], two)).toString("latin1");
  assert.match(raw, /<0001> <0041>/);
  assert.doesNotMatch(raw, /<0042>/);
  assert.match(later, /<0001> <0042>/);
  assert.doesNotMatch(later, /<0041>/);
  assert.match(raw, /\/F1 /);
  assert.match(later, /\/F1 /);
});

test("opaque run data cannot be changed through measured sites or forged glyph arrays", async () => {
  const font = await fixtureFont();
  const options = fontOptions({ resources: { Demo: font } });
  const pages = measure(fontDocument([fontText("A")]), resolved(options));
  const page = pages[0];
  const node = page?.children[0];
  assert.ok(page && node?.type === "text");
  const line = node.lines[0];
  assert.ok(line);
  assert.ok(!("glyphs" in line) && Object.isFrozen(line.run));
  const site = { ...line, text: "B", glyphs: [] };
  const probe = { ...page, children: [{ ...node, lines: [site] }] };
  const resources = collected([probe], options);
  assert.equal(resources.page(probe).painting(site, textSlot).payload.value, "0001");
});
