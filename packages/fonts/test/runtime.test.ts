import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { createOwnedResource, ownedResourceBytes, type TextRun } from "@updf/core/resources";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { createTextService } from "@updf/text";
import { fixtureFont, fontDocument, fontText } from "../../../tests/fixtures/fonts/font-fixture.js";
import { resolveRun } from "../dist/runtime.js";

test("runtime-private runs join only matching owner, resource, size and mode, retaining singleton identity", () => {
  const runtime = fontRuntime(),
    otherRuntime = fontRuntime(),
    font = createHelvetica();
  const a = runtime.measure(font, "A", 10, "rich", ""),
    b = runtime.measure(font, "B", 10, "rich", "");
  assert.ok(Object.isFrozen(a.run) && Object.keys(a.run).length === 0);
  assert.equal(runtime.joinRuns([a.run], ""), a.run);
  const joined = runtime.joinRuns([a.run, b.run], "");
  assert.notEqual(joined, a.run);
  assert.equal(resolveRun(runtime, joined, "").text, "AB");
  for (const runs of [
    [],
    [{} as TextRun],
    [otherRuntime.measure(font, "A", 10, "rich", "").run],
    [a.run, runtime.measure(createHelvetica(), "A", 10, "rich", "").run],
    [a.run, runtime.measure(font, "A", 11, "rich", "").run],
    [a.run, runtime.measure(font, "A", 10, "fixed", "").run],
  ]) {
    assert.throws(
      () => runtime.joinRuns(runs, "/join"),
      (error: unknown) =>
        error instanceof DocumentError &&
        error.diagnostics[0]?.code === "FONT_RESOURCE" &&
        error.diagnostics[0]?.path === "/join",
    );
  }
  assert.throws(() => runtime.validateResource(createOwnedResource(font.metadata), "/font"), DocumentError);
});

test("fixed and rich policies preserve Helvetica and prepared numeric envelopes and resource byte counts", async () => {
  const runtime = fontRuntime(),
    font = await fixtureFont(),
    builtin = createHelvetica();
  assert.deepEqual(runtime.fixedPolicy(builtin, ""), { baseline: "ascent", checkInk: false });
  assert.deepEqual(runtime.fixedPolicy(font, ""), { baseline: "center-envelope", checkInk: true });
  const metric = runtime.measure(builtin, "AB", 10, "rich", "");
  assert.equal(metric.advance, 13.34);
  assert.equal(metric.ascent, 7.75);
  assert.equal(metric.descent, 10 - metric.ascent);
  assert.equal(runtime.measure(builtin, "AB", 10, "fixed", "").descent, 10 * (1 - 0.775));
  assert.equal(ownedResourceBytes(font), font.metadata.byteLength);
  assert.equal(ownedResourceBytes(createOwnedResource({ other: true })), 0);
  assert.equal(runtime.measure(font, " ", 10, "rich", "").empty, true);
});

test("prepared-only PDFs have no synthetic Helvetica and reject a provider with a foreign runtime", async () => {
  const font = await fixtureFont(),
    runtime = fontRuntime();
  const document = fontDocument([fontText("ABC")]);
  const options = {
    resources: { Demo: font },
    text: createTextService({ runtime }),
    providers: [fontProvider(runtime)],
  };
  const raw = Buffer.from(render(document, options)).toString("latin1");
  assert.match(raw, /\/F1 /);
  assert.doesNotMatch(raw, /Helvetica/);
  assert.throws(() => render(document, { ...options, providers: [fontProvider(fontRuntime())] }), DocumentError);
});

test("joining prepared runs concatenates existing glyph identities without CID allocation", async () => {
  const font = await fixtureFont(),
    runtime = fontRuntime();
  const first = runtime.measure(font, "A", 10, "rich", "").run;
  const second = runtime.measure(font, "B", 10, "rich", "").run;
  const joined = resolveRun(runtime, runtime.joinRuns([second, first, second], "/join"), "");
  const a = resolveRun(runtime, first, ""),
    b = resolveRun(runtime, second, "");
  assert.equal(joined.text, "BAB");
  assert.deepEqual(joined.glyphs, [b.glyphs[0], a.glyphs[0], b.glyphs[0]]);
  assert.equal(joined.glyphs[0], b.glyphs[0]);
  assert.ok(Object.isFrozen(joined.glyphs));
  assert.ok(!("cids" in joined));
});

test("distinct Helvetica handles stay distinct resources while aliases share their key", () => {
  const runtime = fontRuntime(),
    first = createHelvetica(),
    second = createHelvetica();
  const document = fontDocument([
    fontText("A", { font: "First" }),
    fontText("B", { font: "Alias", y: 100 }),
    fontText("C", { font: "Other", y: 200 }),
  ]);
  const raw = Buffer.from(
    render(document, {
      resources: { First: first, Alias: first, Other: second },
      text: createTextService({ runtime }),
      providers: [fontProvider(runtime)],
    }),
  ).toString("latin1");
  assert.equal((raw.match(/\/BaseFont \/Helvetica/g) ?? []).length, 2);
  assert.equal((raw.match(/\/F1 16 Tf/g) ?? []).length, 2);
  assert.equal((raw.match(/\/F2 16 Tf/g) ?? []).length, 1);
});
